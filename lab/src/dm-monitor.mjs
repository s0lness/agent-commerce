#!/usr/bin/env node

/**
 * Proactive DM monitoring for operator bot
 * Checks Matrix DMs and sends notifications when new messages arrive
 * Usage: node src/dm-monitor.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT_DIR, 'runs', 'operator', 'dm_monitor_state.json');

// Load environment
const bootstrapEnv = fs.readFileSync(path.join(ROOT_DIR, '.local', 'bootstrap.env'), 'utf8');
const secretsEnv = fs.readFileSync(path.join(ROOT_DIR, '.local', 'secrets.env'), 'utf8');

const env = {};
[bootstrapEnv, secretsEnv].forEach(content => {
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  });
});

const HOMESERVER = env.HOMESERVER || 'http://127.0.0.1:18008';
const OPERATOR_TOKEN = env.OPERATOR_TOKEN;
const OPERATOR_MXID = env.OPERATOR_MXID;

if (!OPERATOR_TOKEN || !OPERATOR_MXID) {
  console.error('[dm-monitor] ERROR: OPERATOR_TOKEN or OPERATOR_MXID not found in secrets.env');
  process.exit(1);
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

async function main() {
  // Ensure state directory exists
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  
  // Load last seen timestamps
  let lastSeen = {};
  if (fs.existsSync(STATE_FILE)) {
    lastSeen = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  
  // Get all joined rooms
  const roomsData = await fetchJson(`${HOMESERVER}/_matrix/client/v3/joined_rooms`, OPERATOR_TOKEN);
  const roomIds = roomsData.joined_rooms || [];
  
  let newMessagesCount = 0;
  
  for (const roomId of roomIds) {
    // Get room members
    const membersData = await fetchJson(`${HOMESERVER}/_matrix/client/v3/rooms/${roomId}/joined_members`, OPERATOR_TOKEN);
    const members = Object.keys(membersData.joined || {});
    
    // Skip if not a DM (not exactly 2 members)
    if (members.length !== 2) continue;
    
    // Get recent messages
    const lastTs = lastSeen[roomId] || 0;
    const messagesData = await fetchJson(`${HOMESERVER}/_matrix/client/v3/rooms/${roomId}/messages?dir=b&limit=10`, OPERATOR_TOKEN);
    const chunk = messagesData.chunk || [];
    
    // Filter for new messages from other party
    const newMessages = chunk.filter(event =>
      event.type === 'm.room.message' &&
      event.sender !== OPERATOR_MXID &&
      event.origin_server_ts > lastTs
    );
    
    if (newMessages.length > 0) {
      newMessagesCount += newMessages.length;
      
      // Get sender and preview
      const firstMsg = newMessages[0];
      const sender = firstMsg.sender;
      const preview = (firstMsg.content?.body || '').slice(0, 80);
      const latestTs = Math.max(...newMessages.map(m => m.origin_server_ts));
      
      // Update last seen
      lastSeen[roomId] = latestTs;
      
      console.error(`[dm-monitor] 📬 New DM from ${sender}: ${preview}`);
      
      // Send notification via OpenClaw system event
      try {
        execSync(
          `openclaw --profile operator-bot system event "📬 New Matrix DM from ${sender}:\\n\\n${preview}\\n\\n(Check full DM in Matrix)"`,
          { stdio: 'pipe' }
        );
      } catch (err) {
        console.error('[dm-monitor] WARN: Failed to send notification:', err.message);
      }
    }
  }
  
  // Save updated state
  fs.writeFileSync(STATE_FILE, JSON.stringify(lastSeen, null, 2));
  
  if (newMessagesCount > 0) {
    console.error(`[dm-monitor] ✓ Found ${newMessagesCount} new messages, notifications sent`);
  } else {
    console.error('[dm-monitor] No new DMs');
  }
}

main().catch(err => {
  console.error('[dm-monitor] ERROR:', err);
  process.exit(1);
});
