const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

function getArg(args, name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function loadState(statePath) {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return { seen: [] };
  }
}

function saveState(statePath, state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function extractText(msg) {
  if (!msg || typeof msg !== "object") return "";
  return (
    msg.text ||
    msg.message ||
    msg.body ||
    (msg.content && msg.content.text) ||
    ""
  );
}

function extractId(msg) {
  if (!msg || typeof msg !== "object") return "";
  return (
    msg.id ||
    msg.messageId ||
    msg.message_id ||
    msg.eventId ||
    msg.event_id ||
    ""
  );
}

function toLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function runOpenClawRead({ target, account, limit }) {
  const args = ["message", "read", "--channel", "telegram", "--target", target, "--json"];
  if (account) args.push("--account", account);
  if (limit) args.push("--limit", String(limit));
  const out = execFileSync("openclaw", args, { encoding: "utf8" });
  return JSON.parse(out);
}

function normalizeMessages(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.messages)) return payload.messages;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function sendToMatrix({ configPath, room, text, dryRun }) {
  if (dryRun) {
    console.log(`[dry-run] send to ${room}: ${text}`);
    return;
  }
  const res = spawnSync(
    "node",
    ["dist/agent.js", "send", "--config", configPath, "--room", room, "--text", text],
    { stdio: "inherit" }
  );
  if (res.status !== 0) {
    throw new Error(`send failed with code ${res.status}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const target = getArg(args, "target") || process.env.TELEGRAM_TARGET;
  const account = getArg(args, "account") || process.env.TELEGRAM_ACCOUNT;
  const configPath = getArg(args, "config") || "config/agent_b.json";
  const room = getArg(args, "room") || "gossip";
  const statePath =
    getArg(args, "state") || path.join("logs", "telegram-relay.json");
  const limit = Number(getArg(args, "limit") || "20");
  const dryRun = args.includes("--dry-run");

  if (!target) {
    console.error("Missing --target or TELEGRAM_TARGET");
    process.exit(1);
  }

  const state = loadState(statePath);
  const seen = new Set(state.seen || []);

  const payload = runOpenClawRead({ target, account, limit });
  const messages = normalizeMessages(payload);

  let sent = 0;
  const newSeen = [];

  for (const msg of messages) {
    const id = extractId(msg);
    const text = extractText(msg);
    const key = id || `${msg.ts || msg.timestamp || ""}:${text}`;
    if (key && seen.has(key)) continue;
    if (key) newSeen.push(key);

    for (const line of toLines(text)) {
      if (!line.startsWith("GOSSIP:")) continue;
      const body = line.replace(/^GOSSIP:\s*/, "");
      if (!body) continue;
      sendToMatrix({ configPath, room, text: body, dryRun });
      sent += 1;
    }
  }

  const merged = [...seen, ...newSeen].slice(-200);
  saveState(statePath, { seen: merged });

  console.log(`relay complete: ${sent} gossip lines sent`);
}

main();
