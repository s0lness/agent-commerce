#!/usr/bin/env node

/**
 * Validate all scenario files in scenarios/ directory
 * Usage: node dist/cli-validate-scenarios.js [--fix]
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { validateScenarioFile } from './scenario-schema.js';
import { log } from './common.js';

const ROOT = process.cwd();
const SCENARIOS_DIR = join(ROOT, 'scenarios');

async function main() {
  const fix = process.argv.includes('--fix');

  log('validate', `🔍 Validating scenarios in ${SCENARIOS_DIR}`);

  const files = await readdir(SCENARIOS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    log('validate', '⚠️  No scenario files found');
    return;
  }

  let validCount = 0;
  let invalidCount = 0;

  for (const file of jsonFiles) {
    const path = join(SCENARIOS_DIR, file);
    const result = await validateScenarioFile(path);

    if (result.valid) {
      console.log(`✅ ${file} - valid`);
      validCount++;
    } else {
      console.log(`❌ ${file} - invalid`);
      invalidCount++;
      for (const err of result.errors) {
        console.log(`   ↳ ${err.field}: ${err.message}`);
      }
    }
  }

  console.log('');
  console.log(`📊 Results: ${validCount} valid, ${invalidCount} invalid`);

  if (invalidCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
