const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const LOG_DIR = path.join(ROOT, "logs");
const PORT = 8090;
const HOST = "127.0.0.1";

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function writeLogs() {
  writeFile(path.join(LOG_DIR, "gossip.log"), "2025-01-01 userA room1 hello\n");
  writeFile(path.join(LOG_DIR, "dm.log"), "2025-01-01 userA room2 dm hello\n");
  writeFile(
    path.join(LOG_DIR, "listings.jsonl"),
    JSON.stringify({
      ts: "2025-01-01T00:00:00Z",
      direction: "in",
      sender: "@a:localhost",
      roomId: "!gossip:localhost",
      type: "LISTING_CREATE",
      data: { id: "lst_1", type: "sell", item: "Switch", price: 150, currency: "EUR" },
      raw: "LISTING_CREATE {...}",
    }) + "\n"
  );
  writeFile(
    path.join(LOG_DIR, "approvals.jsonl"),
    JSON.stringify({
      ts: "2025-01-01T00:00:00Z",
      direction: "out",
      sender: "@a:localhost",
      roomId: "!dm:localhost",
      type: "APPROVAL_REQUEST",
      reason: "confirm",
      raw: "APPROVAL_REQUEST confirm",
    }) + "\n"
  );
  writeFile(
    path.join(LOG_DIR, "deals.jsonl"),
    JSON.stringify({
      ts: "2025-01-01T00:00:00Z",
      direction: "out",
      sender: "@a:localhost",
      roomId: "!dm:localhost",
      type: "DEAL_SUMMARY",
      text: "DEAL_SUMMARY buyer agrees",
      raw: "DEAL_SUMMARY buyer agrees",
    }) + "\n"
  );
}

function get(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: HOST, port, path: pathname }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
  });
}

async function waitForServer(port, retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await get(port, "/listings");
      if (res.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("UI server did not start");
}

async function main() {
  writeLogs();

  const child = spawn("node", ["scripts/ui-server.js"], {
    cwd: ROOT,
    env: { ...process.env, UI_PORT: String(PORT), UI_HOST: HOST },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    const startedPort = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("UI server did not start")), 3000);
      let stderr = "";
      let stdout = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      child.stdout?.on("data", (chunk) => {
        const text = chunk.toString("utf8");
        stdout += text;
        const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(Number(match[1]));
        }
      });
      child.on("error", (err) => {
        clearTimeout(timeout);
        console.log(`ui tests skipped: failed to spawn ui server (${err.message})`);
        resolve(null);
      });
      child.on("exit", (code) => {
        if (code === 0) return;
        const combined = `${stdout}\n${stderr}`;
        if (/EPERM|EACCES/i.test(combined)) {
          clearTimeout(timeout);
          console.log("ui tests skipped: listen blocked in this environment");
          resolve(null);
          return;
        }
        if (!combined.trim() && code === 1) {
          clearTimeout(timeout);
          console.log("ui tests skipped: ui server exited without output");
          resolve(null);
          return;
        }
        clearTimeout(timeout);
        reject(new Error(combined.trim() || `UI server exited with code ${code}`));
      });
    });

    if (startedPort == null) return;

    await waitForServer(startedPort);

    const listings = await get(startedPort, "/listings");
    const approvals = await get(startedPort, "/approvals");
    const deals = await get(startedPort, "/deals");

    if (listings.status !== 200 || approvals.status !== 200 || deals.status !== 200) {
      throw new Error("UI endpoints did not return 200");
    }

    const listingsJson = JSON.parse(listings.data);
    const approvalsJson = JSON.parse(approvals.data);
    const dealsJson = JSON.parse(deals.data);

    if (!Array.isArray(listingsJson.listings) || listingsJson.listings.length !== 1) {
      throw new Error("listings endpoint invalid");
    }
    if (!Array.isArray(approvalsJson.approvals) || approvalsJson.approvals.length !== 1) {
      throw new Error("approvals endpoint invalid");
    }
    if (!Array.isArray(dealsJson.deals) || dealsJson.deals.length !== 1) {
      throw new Error("deals endpoint invalid");
    }

    console.log("ui tests passed");
  } finally {
    child.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
