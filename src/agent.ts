import fs from "fs";
import { AgentConfig, RawEvent } from "./types";
import { decideActions } from "./policy";
import { logEvent } from "./log";
import { GatewayTransport } from "./transports/gateway";

function loadConfig(path: string): AgentConfig {
  const raw = fs.readFileSync(path, "utf8");
  return JSON.parse(raw) as AgentConfig;
}

export function startAgent(configPath: string) {
  const config = loadConfig(configPath);
  const policy = config.policy ?? { kind: "none" };
  const transport = new GatewayTransport(config.gateway_url, config.agent_id);

  async function handleEvent(event: RawEvent) {
    logEvent(event);
    const actions = await decideActions(config.agent_id, config.goals, event, policy);
    actions.forEach((action) => transport.send(action));
  }

  transport.start(handleEvent);

  console.log(`Agent running: ${config.agent_id}`);
}
