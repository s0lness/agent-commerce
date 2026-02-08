#!/usr/bin/env node

/**
 * Enhanced export CLI with flexible filtering
 * Usage: node dist/cli-export.js [options]
 *   --dir=runs/xxx        Directory to export from
 *   --agent=@buyer:...    Filter by agent user ID
 *   --from=2026-02-07     Filter by start date
 *   --to=2026-02-08       Filter by end date
 *   --listing=lst_xxx     Filter by listing ID in message body
 *   --format=jsonl|json|csv  Output format (default: jsonl)
 *   --out=path            Output file path
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { log } from './common.js';

interface RoomEvent {
  type: string;
  sender: string;
  content?: {
    body?: string;
  };
  origin_server_ts: number;
  event_id?: string;
}

interface ExportOptions {
  dir?: string;
  agent?: string;
  from?: string;
  to?: string;
  listing?: string;
  format?: 'jsonl' | 'json' | 'csv';
  out?: string;
}

function parseArgs(): ExportOptions {
  const opts: ExportOptions = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      (opts as any)[key] = value;
    }
  }
  return opts;
}

function filterEvent(event: RoomEvent, opts: ExportOptions): boolean {
  // Filter by agent
  if (opts.agent && !event.sender.includes(opts.agent)) {
    return false;
  }

  // Filter by date range
  if (opts.from || opts.to) {
    const eventDate = new Date(event.origin_server_ts).toISOString().split('T')[0];
    if (opts.from && eventDate < opts.from) return false;
    if (opts.to && eventDate > opts.to) return false;
  }

  // Filter by listing ID in body
  if (opts.listing) {
    const body = event.content?.body || '';
    if (!body.includes(opts.listing)) return false;
  }

  return true;
}

function formatOutput(events: RoomEvent[], format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(events, null, 2);
    
    case 'csv':
      const headers = ['timestamp', 'sender', 'message', 'event_id'];
      const rows = [headers.join(',')];
      for (const event of events) {
        const ts = new Date(event.origin_server_ts).toISOString();
        const sender = event.sender;
        const message = (event.content?.body || '').replace(/"/g, '""'); // Escape quotes
        const id = event.event_id || '';
        rows.push(`"${ts}","${sender}","${message}","${id}"`);
      }
      return rows.join('\n');
    
    case 'jsonl':
    default:
      return events.map(e => JSON.stringify(e)).join('\n');
  }
}

async function main() {
  const opts = parseArgs();

  if (!opts.dir) {
    console.error('Usage: node dist/cli-export.js --dir=runs/xxx [options]');
    console.error('');
    console.error('Options:');
    console.error('  --agent=@buyer:localhost    Filter by agent user ID');
    console.error('  --from=2026-02-07           Filter by start date');
    console.error('  --to=2026-02-08             Filter by end date');
    console.error('  --listing=lst_xxx           Filter by listing ID in message');
    console.error('  --format=jsonl|json|csv     Output format (default: jsonl)');
    console.error('  --out=path                  Output file (default: stdout)');
    process.exit(1);
  }

  const format = opts.format || 'jsonl';
  log('export', `Exporting from ${opts.dir} (format: ${format})`);

  // Read transcripts
  const dmPath = join(opts.dir, 'out', 'dm.jsonl');
  const marketPath = join(opts.dir, 'out', 'market.jsonl');

  const allEvents: RoomEvent[] = [];

  // Load DM transcript
  try {
    const dmContent = await readFile(dmPath, 'utf-8');
    const dmLines = dmContent.trim().split(/\r?\n/).filter(Boolean);
    for (const line of dmLines) {
      try {
        const event = JSON.parse(line);
        if (filterEvent(event, opts)) {
          allEvents.push(event);
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    log('export', `Warning: Could not read ${dmPath}`);
  }

  // Load market transcript
  try {
    const marketContent = await readFile(marketPath, 'utf-8');
    const marketLines = marketContent.trim().split(/\r?\n/).filter(Boolean);
    for (const line of marketLines) {
      try {
        const event = JSON.parse(line);
        if (filterEvent(event, opts)) {
          allEvents.push(event);
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    log('export', `Warning: Could not read ${marketPath}`);
  }

  // Sort by timestamp
  allEvents.sort((a, b) => a.origin_server_ts - b.origin_server_ts);

  // Format output
  const output = formatOutput(allEvents, format);

  // Write or print
  if (opts.out) {
    await writeFile(opts.out, output);
    log('export', `Wrote ${allEvents.length} events to ${opts.out}`);
  } else {
    console.log(output);
    log('export', `${allEvents.length} events exported`);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
