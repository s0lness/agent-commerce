#!/usr/bin/env node
/**
 * Run Matrix Poller - Start autonomous marketplace monitoring
 * 
 * Usage: node dist/run-poller.js <config.json>
 * 
 * Config format:
 * {
 *   "homeserver": "http://127.0.0.1:18008",
 *   "marketRoomId": "!abc123:localhost",
 *   "pollIntervalMs": 30000,
 *   "stateFile": "runs/poller/state.env",
 *   "buyers": [
 *     {
 *       "profile": "live-buyer-1",
 *       "interests": ["switch", "nintendo"],
 *       "mxid": "@switch_buyer:localhost",
 *       "accessToken": "...",
 *       "gatewayUrl": "http://127.0.0.1:18810",
 *       "gatewayToken": "token-live-buyer-1"
 *     }
 *   ]
 * }
 */

import { MatrixPoller } from './matrix-poller.js';
import { readFile } from 'node:fs/promises';
import { log, logError } from './common.js';

interface PollerConfig {
  homeserver: string;
  marketRoomId: string;
  pollIntervalMs?: number;
  stateFile: string;
  buyers: Array<{
    profile: string;
    interests: string[];
    mxid: string;
    accessToken: string;
    gatewayUrl: string;
    gatewayToken: string;
  }>;
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('usage: run-poller.ts <config.json>');
    console.error('');
    console.error('Example config:');
    console.error(JSON.stringify({
      homeserver: 'http://127.0.0.1:18008',
      marketRoomId: '!abc123:localhost',
      pollIntervalMs: 30000,
      stateFile: 'runs/poller/state.env',
      buyers: [{
        profile: 'live-buyer-1',
        interests: ['switch', 'nintendo'],
        mxid: '@switch_buyer:localhost',
        accessToken: 'token123',
        gatewayUrl: 'http://127.0.0.1:18810',
        gatewayToken: 'token-live-buyer-1'
      }]
    }, null, 2));
    process.exit(1);
  }

  let config: PollerConfig;
  try {
    const content = await readFile(configPath, 'utf-8');
    config = JSON.parse(content);
  } catch (err: any) {
    logError('run-poller', `failed to load config: ${err.message}`);
    process.exit(1);
  }

  // Validate config
  if (!config.homeserver || !config.marketRoomId || !config.stateFile || !config.buyers?.length) {
    logError('run-poller', 'invalid config: missing required fields');
    process.exit(1);
  }

  log('run-poller', `starting poller with ${config.buyers.length} buyers`);
  log('run-poller', `market room: ${config.marketRoomId}`);
  log('run-poller', `poll interval: ${config.pollIntervalMs || 30000}ms`);

  const poller = new MatrixPoller(
    config.homeserver,
    config.marketRoomId,
    config.buyers,
    config.stateFile,
    config.pollIntervalMs || 30000
  );

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    log('run-poller', 'received SIGTERM, stopping...');
    poller.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    log('run-poller', 'received SIGINT, stopping...');
    poller.stop();
    process.exit(0);
  });

  // Start polling
  try {
    await poller.start();
  } catch (err: any) {
    logError('run-poller', `poller crashed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

main();
