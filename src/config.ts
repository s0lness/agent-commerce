import fs from "fs";
import { AgentConfig } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Config "${key}" must be a non-empty string`);
  }
  return value;
}

function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Config "${key}" must be a string`);
  }
  return value;
}

function optionalBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
  const value = obj[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Config "${key}" must be a boolean`);
  }
  return value;
}

function optionalNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const value = obj[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Config "${key}" must be a finite number`);
  }
  return value;
}

function validateConfig(raw: Record<string, unknown>): AgentConfig {
  const base_url = requireString(raw, "base_url");
  const user_id = requireString(raw, "user_id");
  const password = optionalString(raw, "password");
  const access_token = optionalString(raw, "access_token");
  if (!access_token && !password) {
    throw new Error('Config requires "password" when "access_token" is missing');
  }

  const log_redact = optionalString(raw, "log_redact");
  if (log_redact && !["none", "dm", "all"].includes(log_redact)) {
    throw new Error('Config "log_redact" must be one of: none, dm, all');
  }

  return {
    base_url,
    user_id,
    password,
    device_id: optionalString(raw, "device_id"),
    access_token,
    persist_access_token: optionalBoolean(raw, "persist_access_token"),
    gossip_room_alias: optionalString(raw, "gossip_room_alias"),
    gossip_room_id: optionalString(raw, "gossip_room_id"),
    dm_room_id: optionalString(raw, "dm_room_id"),
    dm_recipient: optionalString(raw, "dm_recipient"),
    log_dir: optionalString(raw, "log_dir"),
    log_redact: log_redact as AgentConfig["log_redact"] | undefined,
    openclaw_url: optionalString(raw, "openclaw_url"),
    openclaw_token: optionalString(raw, "openclaw_token"),
    openclaw_timeout_ms: optionalNumber(raw, "openclaw_timeout_ms"),
    goals: Array.isArray(raw.goals)
      ? raw.goals.filter((g) => typeof g === "string")
      : [],
  };
}

export function loadConfig(path: string): AgentConfig {
  const raw = fs.readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Config must be a JSON object");
  }
  return validateConfig(parsed);
}

export function saveConfig(path: string, config: AgentConfig): void {
  fs.writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf8");
}
