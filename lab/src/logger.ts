/**
 * Structured logging with levels and JSON output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  data?: any;
  runId?: string;
  agentProfile?: string;
}

let currentLevel: LogLevel = LogLevel.INFO;
let runContext: { runId?: string; agentProfile?: string } = {};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function setRunContext(runId?: string, agentProfile?: string): void {
  runContext = { runId, agentProfile };
}

function shouldLog(level: LogLevel): boolean {
  return level >= currentLevel;
}

function formatEntry(entry: LogEntry): string {
  if (process.env.LOG_FORMAT === 'json') {
    // Remove undefined fields for cleaner JSON
    const cleaned = Object.fromEntries(
      Object.entries(entry).filter(([_, v]) => v !== undefined)
    );
    return JSON.stringify(cleaned);
  }
  
  // Human-readable format for console
  const levelStr = entry.level.padEnd(5);
  const time = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, 12);
  const ctx = entry.runId ? ` [${entry.runId}]` : '';
  const agent = entry.agentProfile ? ` <${entry.agentProfile}>` : '';
  return `${time} ${levelStr} [${entry.component}]${ctx}${agent} ${entry.message}`;
}

function createEntry(
  level: LogLevel,
  component: string,
  message: string,
  data?: any
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel[level],
    component,
    message,
  };
  
  if (data !== undefined) entry.data = data;
  if (runContext.runId) entry.runId = runContext.runId;
  if (runContext.agentProfile) entry.agentProfile = runContext.agentProfile;
  
  return entry;
}

export function debug(component: string, message: string, data?: any): void {
  if (!shouldLog(LogLevel.DEBUG)) return;
  const entry = createEntry(LogLevel.DEBUG, component, message, data);
  console.debug(formatEntry(entry));
}

export function info(component: string, message: string, data?: any): void {
  if (!shouldLog(LogLevel.INFO)) return;
  const entry = createEntry(LogLevel.INFO, component, message, data);
  console.log(formatEntry(entry));
}

export function warn(component: string, message: string, data?: any): void {
  if (!shouldLog(LogLevel.WARN)) return;
  const entry = createEntry(LogLevel.WARN, component, message, data);
  console.warn(formatEntry(entry));
}

export function error(component: string, message: string, data?: any): void {
  if (!shouldLog(LogLevel.ERROR)) return;
  const entry = createEntry(LogLevel.ERROR, component, message, data);
  console.error(formatEntry(entry));
}

// Legacy compatibility
export function log(component: string, message: string): void {
  info(component, message);
}

export function logError(component: string, message: string): void {
  error(component, message);
}
