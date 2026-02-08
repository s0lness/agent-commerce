#!/usr/bin/env tsx

/**
 * Proactive DM monitoring for operator bot
 * Checks Matrix DMs and sends notifications when new messages arrive
 * Usage: tsx src/dm-monitor.ts [--loop]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { execSync } from "child_process";

const ROOT_DIR = resolve(__dirname, "..");
const STATE_FILE = resolve(ROOT_DIR, "runs", "operator", "dm_monitor_state.json");

interface MatrixEvent {
  type: string;
  sender: string;
  origin_server_ts: number;
  content?: {
    body?: string;
  };
}

interface DmMonitorState {
  [roomId: string]: number; // roomId -> last seen timestamp
}

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};

  const bootstrapEnvPath = resolve(ROOT_DIR, ".local", "bootstrap.env");
  const secretsEnvPath = resolve(ROOT_DIR, ".local", "secrets.env");

  for (const envPath of [bootstrapEnvPath, secretsEnvPath]) {
    if (!existsSync(envPath)) continue;

    const content = readFileSync(envPath, "utf8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^export\s+([^=]+)="?([^"]*)"?$/);
      if (match) {
        env[match[1]] = match[2];
      }
    });
  }

  return env;
}

async function fetchJson(url: string, token: string): Promise<any> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.json();
}

async function checkDms(): Promise<number> {
  const env = loadEnv();

  const homeserver = env.HOMESERVER || "http://127.0.0.1:18008";
  const operatorAuth = env.OPERATOR_TOKEN; // loaded from local env
  const operatorMxid = env.OPERATOR_MXID;

  if (!operatorAuth || !operatorMxid) {
    console.error("[dm-monitor] ERROR: OPERATOR_TOKEN or OPERATOR_MXID not found in secrets.env");
    process.exit(1);
  }

  // Ensure state directory exists
  mkdirSync(dirname(STATE_FILE), { recursive: true });

  // Load last seen timestamps
  let lastSeen: DmMonitorState = {};
  if (existsSync(STATE_FILE)) {
    lastSeen = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  }

  // Get all joined rooms
  const roomsData = await fetchJson(`${homeserver}/_matrix/client/v3/joined_rooms`, operatorAuth);
  const roomIds: string[] = roomsData.joined_rooms || [];

  let newMessagesCount = 0;

  for (const roomId of roomIds) {
    // Get room members
    const membersData = await fetchJson(
      `${homeserver}/_matrix/client/v3/rooms/${roomId}/joined_members`,
      operatorAuth
    );
    const members = Object.keys(membersData.joined || {});

    // Skip if not a DM (not exactly 2 members)
    if (members.length !== 2) continue;

    // Get recent messages
    const lastTs = lastSeen[roomId] || 0;
    const messagesData = await fetchJson(
      `${homeserver}/_matrix/client/v3/rooms/${roomId}/messages?dir=b&limit=10`,
      operatorAuth
    );
    const chunk: MatrixEvent[] = messagesData.chunk || [];

    // Filter for new messages from other party
    const newMessages = chunk.filter(
      (event) =>
        event.type === "m.room.message" &&
        event.sender !== operatorMxid &&
        event.origin_server_ts > lastTs
    );

    if (newMessages.length > 0) {
      newMessagesCount += newMessages.length;

      // Get sender and preview
      const firstMsg = newMessages[0];
      const sender = firstMsg.sender;
      const preview = (firstMsg.content?.body || "").slice(0, 80);
      const latestTs = Math.max(...newMessages.map((m) => m.origin_server_ts));

      // Update last seen
      lastSeen[roomId] = latestTs;

      console.log(`[dm-monitor] 📬 New DM from ${sender}: ${preview}`);

      // Send notification via OpenClaw system event
      try {
        execSync(
          `openclaw --profile operator-bot system event "📬 New Matrix DM from ${sender}:\\n\\n${preview}\\n\\n(Check full DM in Matrix)"`,
          { stdio: "pipe" }
        );
      } catch (err) {
        console.error(
          "[dm-monitor] WARN: Failed to send notification:",
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  // Save updated state
  writeFileSync(STATE_FILE, JSON.stringify(lastSeen, null, 2));

  if (newMessagesCount > 0) {
    console.log(`[dm-monitor] ✓ Found ${newMessagesCount} new messages, notifications sent`);
  } else {
    console.log("[dm-monitor] No new DMs");
  }

  return newMessagesCount;
}

async function main() {
  const args = process.argv.slice(2);
  const loopMode = args.includes("--loop");

  if (loopMode) {
    console.log("[dm-monitor] Starting in loop mode (check every 60 seconds)");
    while (true) {
      try {
        await checkDms();
      } catch (err) {
        console.error("[dm-monitor] ERROR:", err instanceof Error ? err.message : err);
      }
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  } else {
    // Single check
    await checkDms();
  }
}

main().catch((err) => {
  console.error("[dm-monitor] ERROR:", err);
  process.exit(1);
});
