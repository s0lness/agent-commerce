#!/usr/bin/env node

/**
 * Analyze audit logs and generate security summary
 * Usage: node dist/cli-audit-summary.js runs/xxx
 */

import { join } from 'path';
import { readFile } from 'fs/promises';
import { generateAuditSummary, type AuditEntry } from './audit-log.js';
import { log } from './common.js';

async function main() {
  const runDir = process.argv[2];

  if (!runDir) {
    console.error('Usage: node dist/cli-audit-summary.js runs/xxx');
    process.exit(1);
  }

  const auditPath = join(runDir, 'out', 'audit.jsonl');
  
  log('audit', `Analyzing ${auditPath}`);

  try {
    // Generate summary
    const summary = await generateAuditSummary(auditPath);

    // Print summary
    console.log('');
    console.log('# Audit Summary');
    console.log('');
    console.log(`**Total Events:** ${summary.totalEvents}`);
    console.log('');
    console.log('## Decisions');
    console.log(`- Offers Made: ${summary.offersMade}`);
    console.log(`- Offers Accepted: ${summary.offersAccepted}`);
    console.log(`- Offers Rejected: ${summary.offersRejected}`);
    console.log('');
    console.log('## Security');
    console.log(`- Constraint Violations: ${summary.constraintViolations}`);
    console.log(`- Injection Attempts: ${summary.injectionAttempts}`);

    if (Object.keys(summary.violationTypes).length > 0) {
      console.log('');
      console.log('### Violation Types');
      for (const [type, count] of Object.entries(summary.violationTypes).sort((a, b) => b[1] - a[1])) {
        console.log(`- ${type}: ${count}`);
      }
    }

    // Security assessment
    console.log('');
    console.log('## Assessment');
    
    const violationRate = summary.totalEvents > 0 
      ? (summary.constraintViolations / summary.totalEvents * 100).toFixed(1)
      : '0.0';
    
    console.log(`- Violation Rate: ${violationRate}% (${summary.constraintViolations}/${summary.totalEvents})`);
    
    if (summary.injectionAttempts > 0) {
      console.log(`- ⚠️  ${summary.injectionAttempts} prompt injection attempts detected`);
    }
    
    if (summary.constraintViolations === 0 && summary.injectionAttempts > 0) {
      console.log('- ✅ All injection attempts blocked by constraints');
    }

    // Read detailed entries for critical issues
    const content = await readFile(auditPath, 'utf-8');
    const lines = content.trim().split(/\r?\n/).filter(Boolean);
    const criticalViolations: AuditEntry[] = [];

    for (const line of lines) {
      try {
        const entry: AuditEntry = JSON.parse(line);
        if (entry.eventType === 'CONSTRAINT_VIOLATION') {
          criticalViolations.push(entry);
        }
      } catch {
        continue;
      }
    }

    if (criticalViolations.length > 0) {
      console.log('');
      console.log('## Critical Violations');
      for (const v of criticalViolations.slice(0, 5)) {
        console.log('');
        console.log(`**${v.decision}**`);
        if (v.reasoning) console.log(`- Reasoning: ${v.reasoning}`);
        if (v.violations) console.log(`- Violations: ${v.violations.join(', ')}`);
        console.log(`- Timestamp: ${v.timestamp}`);
      }
      if (criticalViolations.length > 5) {
        console.log(`\n... and ${criticalViolations.length - 5} more`);
      }
    }

    console.log('');

    // Exit with error if security issues found
    if (summary.constraintViolations > 0) {
      console.error('⚠️  Security violations detected');
      process.exit(1);
    }

  } catch (err: any) {
    if (err.code === 'ENOENT') {
      log('audit', 'No audit log found - run may not have security logging enabled');
      process.exit(0);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
