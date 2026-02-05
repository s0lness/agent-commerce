import { AgentConfig, RawEvent } from "./types";
import { logEvent } from "./log";
import { MatrixTransport } from "./transports/matrix";
import { loadConfig } from "./config";
import { postJson } from "./http";

export function startAgent(configPath: string) {
  const config = loadConfig(configPath);
  const transport = new MatrixTransport(configPath);
  const logDir = config.log_dir ?? "logs";
  const openclawUrl = config.openclaw_url;
  const openclawToken = config.openclaw_token;

  async function handleEvent(event: RawEvent) {
    logEvent(event, logDir);
    if (openclawUrl) {
      const headers: Record<string, string> = {};
      if (openclawToken) {
        headers.Authorization = `Bearer ${openclawToken}`;
      }
      postJson(openclawUrl, { event }).catch((err) => {
        console.error("OpenClaw notify failed:", err?.message ?? err);
      });
    }
  }

  transport.start(handleEvent);

  console.log(`Agent running: ${config.user_id}`);
}
