import fs from "fs";
import { startGateway } from "./gateway";
import { startAgent } from "./agent";
import { httpRequest } from "./http";
import { AgentConfig } from "./types";

function getArg(args: string[], name: string): string | null {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function loadConfig(path: string): AgentConfig {
  const raw = fs.readFileSync(path, "utf8");
  return JSON.parse(raw) as AgentConfig;
}

function readEvents(logPath: string) {
  if (!fs.existsSync(logPath)) {
    throw new Error(`Log not found: ${logPath}`);
  }
  const raw = fs.readFileSync(logPath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === "gateway") {
    const portRaw = getArg(args, "port");
    const host = getArg(args, "host") ?? undefined;
    const port = portRaw ? Number(portRaw) : undefined;
    startGateway(port, host);
    return;
  }

  if (cmd === "agent") {
    const config = getArg(args, "config");
    if (!config) throw new Error("--config is required");
    startAgent(config);
    return;
  }

  if (cmd === "send") {
    const configPath = getArg(args, "config");
    const channel = getArg(args, "channel");
    const body = getArg(args, "body");
    const to = getArg(args, "to");
    const from = getArg(args, "from");
    const gateway = getArg(args, "gateway");

    if (!channel || !body) {
      throw new Error("--channel and --body are required");
    }

    let agentId = from ?? "anonymous";
    let gatewayUrl = gateway ?? "http://127.0.0.1:3333";
    if (configPath) {
      const cfg = loadConfig(configPath);
      agentId = cfg.agent_id;
      gatewayUrl = cfg.gateway_url;
    }

    const base = gatewayUrl.replace(/\/$/, "");
    if (channel === "gossip") {
      httpRequest(`${base}/gossip`, "POST", { from: agentId, body }).catch(() => {});
    } else if (channel === "dm") {
      if (!to) throw new Error("--to is required for dm");
      httpRequest(`${base}/dm`, "POST", { from: agentId, to, body }).catch(() => {});
    } else {
      throw new Error("--channel must be gossip or dm");
    }
    return;
  }

  if (cmd === "events") {
    const logPath = getArg(args, "log") ?? "logs/events.jsonl";
    const channel = getArg(args, "channel");
    const from = getArg(args, "from");
    const to = getArg(args, "to");
    const contains = getArg(args, "contains");
    const limitRaw = getArg(args, "limit");
    const limit = limitRaw ? Number(limitRaw) : 50;
    if (limitRaw && !Number.isFinite(limit)) throw new Error("--limit must be a number");

    let events = readEvents(logPath);
    if (channel) events = events.filter((e) => e.channel === channel);
    if (from) events = events.filter((e) => e.from === from);
    if (to) events = events.filter((e) => e.to === to);
    if (contains) events = events.filter((e) => String(e.body || "").includes(contains));

    const slice = events.slice(Math.max(0, events.length - limit));
    slice.forEach((e) => console.log(JSON.stringify(e)));
    return;
  }

  throw new Error("Command required: gateway | agent | send | events");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
