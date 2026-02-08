// @ts-nocheck
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log("Usage: node dist-tools/create-room.js <room-name> [--public|--private]");
  console.log("Example: node dist-tools/create-room.js gossip --public");
}

function parseEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

async function postJson(url: string, payload: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, json, text };
}

async function main() {
  const roomName = process.argv[2];
  const visibilityArg = process.argv[3] || "--private";
  if (!roomName) {
    usage();
    process.exit(1);
  }

  const root = path.resolve(__dirname, "../");
  const envFile = path.join(root, "matrix.env");
  if (!fs.existsSync(envFile)) throw new Error("matrix.env not found. Run node dist-tools/setup-synapse.js first.");

  const fileEnv = parseEnv(envFile);
  const matrixServer = fileEnv.MATRIX_SERVER;
  const serverName = fileEnv.SERVER_NAME || "localhost";
  if (!matrixServer) throw new Error("MATRIX_SERVER not set in matrix.env");

  const matrixUser = process.env.MATRIX_USER;
  const matrixPassword = process.env.MATRIX_PASSWORD;
  if (!matrixUser || !matrixPassword) {
    throw new Error(`Set MATRIX_USER and MATRIX_PASSWORD in your shell. Example: MATRIX_USER='@agent_a:${serverName}' MATRIX_PASSWORD='pass' node dist-tools/create-room.js ${roomName} ${visibilityArg}`);
  }

  const vis = visibilityArg === "--public" ? "public" : "private";
  const preset = vis === "public" ? "public_chat" : "private_chat";

  console.log(`Logging in as ${matrixUser}...`);
  const login = await postJson(`${matrixServer}/_matrix/client/v3/login`, { type: "m.login.password", user: matrixUser, password: matrixPassword });
  const accessToken = (login.json as any)?.access_token || "";
  if (!accessToken) throw new Error(`Login failed. Response: ${login.text}`);

  console.log(`Creating room ${roomName} (${vis})...`);
  const create = await postJson(`${matrixServer}/_matrix/client/v3/createRoom`, {
    room_alias_name: roomName.replace(/^#/, ""),
    name: roomName,
    visibility: vis,
    preset,
  }, accessToken);

  const roomId = (create.json as any)?.room_id || "";
  if (!roomId) throw new Error(`Room creation failed. Response: ${create.text}`);

  const roomsDir = path.join(root, "rooms");
  fs.mkdirSync(roomsDir, { recursive: true });
  const out = path.join(roomsDir, `${roomName}.json`);
  fs.writeFileSync(out, JSON.stringify({ room_id: roomId, room_name: roomName, visibility: vis }, null, 2) + "\n", "utf8");

  console.log(`Room created: ${roomId}`);
  console.log(`Saved to: ${out}`);
}

main().catch((err) => {
  console.error((err as Error)?.message || String(err));
  process.exit(1);
});
