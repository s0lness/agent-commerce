const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const distAgent = path.join(__dirname, "..", "dist", "agent.js");
if (!fs.existsSync(distAgent)) {
  console.error("dist/agent.js not found. Run `npm run build` first.");
  process.exit(1);
}

function run(label, args) {
  const child = spawn("node", [distAgent, ...args], { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`${label} exited with code ${code}`);
    }
  });
  return child;
}

run("agent_a_script", [
  "scripted",
  "--config",
  "config/agent_a.json",
  "--room",
  "gossip",
  "--script",
  "scripts/agent_a.script",
]);

run("agent_b_script", [
  "scripted",
  "--config",
  "config/agent_b.json",
  "--room",
  "dm",
  "--script",
  "scripts/agent_b.script",
]);

