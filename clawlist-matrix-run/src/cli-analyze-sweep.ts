#!/usr/bin/env node

/**
 * Analyze sweep results and generate statistics
 * Usage: node dist/cli-analyze-sweep.js <sweep_dir> [--csv]
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { analyzeSweep, formatStats, exportCSV } from './sweep-stats.js';
import { log } from './common.js';

async function main() {
  const args = process.argv.slice(2);
  const sweepDir = args.find(a => !a.startsWith('--'));
  const outputCSV = args.includes('--csv');

  if (!sweepDir) {
    console.error('Usage: node dist/cli-analyze-sweep.js <sweep_dir> [--csv]');
    process.exit(1);
  }

  log('analyze', `Analyzing sweep: ${sweepDir}`);

  const stats = await analyzeSweep(sweepDir);

  // Write markdown report
  const markdown = formatStats(stats);
  const mdPath = join(sweepDir, 'sweep-stats.md');
  await writeFile(mdPath, markdown);
  console.log(`✅ Wrote report: ${mdPath}`);

  // Optionally export CSV
  if (outputCSV) {
    const csv = exportCSV(stats);
    const csvPath = join(sweepDir, 'sweep-data.csv');
    await writeFile(csvPath, csv);
    console.log(`✅ Wrote CSV: ${csvPath}`);
  }

  // Print summary to console
  console.log('');
  console.log(markdown);
  
  // Exit with error if success rate < 50%
  if (stats.successRate < 0.5) {
    console.error(`⚠️  Low success rate: ${(stats.successRate * 100).toFixed(1)}%`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
