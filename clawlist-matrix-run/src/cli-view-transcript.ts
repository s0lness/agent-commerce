#!/usr/bin/env node

/**
 * Pretty-print Matrix transcript files (JSONL)
 * Usage: node dist/cli-view-transcript.js <path> [--filter=keyword] [--json]
 */

import { readFile } from 'fs/promises';
import { log } from './common.js';

interface RoomEvent {
  type: string;
  sender: string;
  content?: {
    body?: string;
    msgtype?: string;
  };
  origin_server_ts: number;
  event_id?: string;
}

// ANSI color codes
const RESET = '\x1b[0m';
const COLORS = {
  seller: '\x1b[36m', // Cyan
  buyer: '\x1b[33m',  // Yellow
  operator: '\x1b[35m', // Magenta
  system: '\x1b[90m', // Gray
  timestamp: '\x1b[90m', // Gray
};

function colorForSender(sender: string): string {
  if (sender.includes('seller')) return COLORS.seller;
  if (sender.includes('buyer')) return COLORS.buyer;
  if (sender.includes('operator')) return COLORS.operator;
  return COLORS.system;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const time = date.toISOString().split('T')[1].slice(0, 12); // HH:MM:SS.mmm
  return `${COLORS.timestamp}[${time}]${RESET}`;
}

function formatSender(sender: string): string {
  const color = colorForSender(sender);
  const shortName = sender.split(':')[0].replace('@', '');
  return `${color}${shortName.padEnd(15)}${RESET}`;
}

function formatMessage(event: RoomEvent, useJson: boolean): string {
  if (useJson) {
    return JSON.stringify(event, null, 2);
  }

  const ts = formatTimestamp(event.origin_server_ts);
  const sender = formatSender(event.sender);
  const body = event.content?.body || '<no body>';
  const msgtype = event.content?.msgtype || event.type;

  return `${ts} ${sender} │ ${body}`;
}

async function main() {
  const args = process.argv.slice(2);
  const path = args.find(a => !a.startsWith('--'));
  const filterArg = args.find(a => a.startsWith('--filter='));
  const useJson = args.includes('--json');

  if (!path) {
    console.error('Usage: node dist/cli-view-transcript.js <path> [--filter=keyword] [--json]');
    process.exit(1);
  }

  const filter = filterArg ? filterArg.split('=')[1].toLowerCase() : null;

  log('view-transcript', `Reading ${path}${filter ? ` (filter: ${filter})` : ''}`);

  const content = await readFile(path, 'utf-8');
  const lines = content.trim().split(/\r?\n/).filter(Boolean);

  let count = 0;
  for (const line of lines) {
    try {
      const event: RoomEvent = JSON.parse(line);

      // Skip non-message events unless in JSON mode
      if (!useJson && event.type !== 'm.room.message') continue;

      // Apply filter
      if (filter) {
        const body = event.content?.body || '';
        if (!body.toLowerCase().includes(filter)) continue;
      }

      console.log(formatMessage(event, useJson));
      count++;
    } catch (err) {
      // Skip invalid JSON lines
      continue;
    }
  }

  console.log('');
  log('view-transcript', `${count} messages displayed (${lines.length} total events)`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
