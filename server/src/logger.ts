type LogLevel = "info" | "warn" | "error";

function writeLog(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

export function logInfo(msg: string, meta?: Record<string, unknown>) {
  writeLog("info", msg, meta);
}

export function logWarn(msg: string, meta?: Record<string, unknown>) {
  writeLog("warn", msg, meta);
}

export function logError(msg: string, meta?: Record<string, unknown>) {
  writeLog("error", msg, meta);
}
