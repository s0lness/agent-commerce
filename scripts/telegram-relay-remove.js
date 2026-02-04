const fs = require("fs");
const path = require("path");

function resolveCronPath() {
  const fromEnv = process.env.OPENCLAW_STATE_DIR;
  if (fromEnv) return path.join(fromEnv, "cron", "jobs.json");
  const home = process.env.HOME || "/home/sylve";
  return path.join(home, ".openclaw", "cron", "jobs.json");
}

function main() {
  const cronPath = resolveCronPath();
  if (!fs.existsSync(cronPath)) {
    console.log("No OpenClaw cron file found.");
    return;
  }
  const raw = fs.readFileSync(cronPath, "utf8");
  const data = JSON.parse(raw);
  data.jobs = (data.jobs || []).filter((j) => j.jobId !== "telegram-relay");
  fs.writeFileSync(cronPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Removed telegram-relay cron job.");
}

main();
