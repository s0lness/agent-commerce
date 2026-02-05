import fs from "fs";
import path from "path";
import { RawEvent } from "./types";

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
const EVENTS_LOG = path.join(LOG_DIR, "events.jsonl");

export function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logEvent(event: RawEvent) {
  ensureLogDir();
  fs.appendFileSync(EVENTS_LOG, JSON.stringify(event) + "\n");
}
