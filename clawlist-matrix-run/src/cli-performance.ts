#!/usr/bin/env node

/**
 * Analyze agent performance metrics across multiple runs
 * Usage: node dist/cli-performance.js runs/sweep_xxx
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { analyzePerformance, formatPerformanceReport } from './performance-metrics.js';
import { log } from './common.js';

async function main() {
  const sweepDir = process.argv[2];

  if (!sweepDir) {
    console.error('Usage: node dist/cli-performance.js runs/sweep_xxx');
    process.exit(1);
  }

  log('performance', `Analyzing ${sweepDir}`);

  // Find all run directories
  const entries = await readdir(sweepDir, { withFileTypes: true });
  const runDirs = entries
    .filter(e => e.isDirectory() && e.name.match(/^.+_\d+$/))
    .map(e => join(sweepDir, e.name));

  if (runDirs.length === 0) {
    console.error('No run directories found');
    process.exit(1);
  }

  log('performance', `Found ${runDirs.length} runs`);

  // Analyze
  const metrics = await analyzePerformance(runDirs);

  // Format and print
  const report = formatPerformanceReport(metrics);
  console.log('');
  console.log(report);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
