import { AgentConfig, RawEvent } from "./types";
import { logEvent } from "./log";
import { MatrixTransport } from "./transports/matrix";
import { loadConfig } from "./config";
import { postJson } from "./http";
import { logError, logInfo } from "./logger";

export function startAgent(configPath: string) {
  const config = loadConfig(configPath);
  const transport = new MatrixTransport(configPath);
  const logDir = config.log_dir ?? "logs";
  const redact = config.log_redact ?? "none";
  const openclawUrl = config.openclaw_url;
  const openclawToken = config.openclaw_token;
  const openclawTimeoutMs = config.openclaw_timeout_ms ?? 5000;

  async function handleEvent(event: RawEvent) {
    logEvent(event, logDir, redact);
    if (openclawUrl) {
      const headers: Record<string, string> = {};
      if (openclawToken) {
        headers.Authorization = `Bearer ${openclawToken}`;
      }
      postJson(openclawUrl, { event }, headers, openclawTimeoutMs).catch((err) => {
        logError("OpenClaw notify failed", { error: err?.message ?? String(err) });
      });
    }
  }

  transport.start(handleEvent);

  logInfo("Agent running", { user_id: config.user_id });
}
