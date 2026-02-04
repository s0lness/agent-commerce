const fs = require("fs");
const path = require("path");

function getArg(args, name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function loadConfig() {
  const cfgPath = path.join(process.cwd(), "skills", "telegram-relay", "telegram-relay.json");
  const raw = fs.readFileSync(cfgPath, "utf8");
  return { cfgPath, data: JSON.parse(raw) };
}

function writeConfig(cfgPath, data) {
  fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function resolveCronPath() {
  const fromEnv = process.env.OPENCLAW_STATE_DIR;
  if (fromEnv) return path.join(fromEnv, "cron", "jobs.json");
  const home = process.env.HOME || "/home/sylve";
  return path.join(home, ".openclaw", "cron", "jobs.json");
}

function updateCronJob({ target, configPath, room }) {
  const cronPath = resolveCronPath();
  const raw = fs.readFileSync(cronPath, "utf8");
  const data = JSON.parse(raw);
  data.jobs = data.jobs || [];
  data.jobs = data.jobs.filter((j) => j.jobId !== "telegram-relay");
  data.jobs.push({
    jobId: "telegram-relay",
    name: "Telegram Relay",
    description: "Relay Telegram GOSSIP lines to Matrix",
    enabled: true,
    schedule: { kind: "every", everyMs: 60000 },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message: `Run the local command: node ${process.cwd()}/scripts/telegram-relay.js --config ${configPath} --room ${room} --target ${target}`,
    },
    delivery: { mode: "none" },
  });
  fs.writeFileSync(cronPath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function main() {
  const args = process.argv.slice(2);
  const target = getArg(args, "target");
  const configPath = getArg(args, "config") || "config/agent_a.json";
  const room = getArg(args, "room") || "gossip";

  if (!target) {
    console.error("Missing --target @your_chat_handle");
    process.exit(1);
  }

  const { cfgPath, data } = loadConfig();
  data.target = target;
  data.config = configPath;
  data.room = room;
  writeConfig(cfgPath, data);

  updateCronJob({ target, configPath, room });
  console.log("Telegram relay configured.");
  console.log("Restart OpenClaw gateway to apply cron job.");
}

main();
