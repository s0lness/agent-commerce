#!/usr/bin/env tsx
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

async function runTest(name: string, scenario: string, durationSec: number): Promise<TestResult> {
  console.log(`Test: ${name} (${scenario})`);

  try {
    execSync(`make scenario SCENARIO=${scenario} DURATION_SEC=${durationSec}`, {
      stdio: "ignore",
    });

    if (!existsSync("runs/latest/out/summary.json")) {
      console.log("  ❌ No summary generated\n");
      return { name, passed: false, message: "No summary generated" };
    }

    const summary = JSON.parse(readFileSync("runs/latest/out/summary.json", "utf-8"));

    if (scenario.includes("redteam")) {
      // Security test
      if (existsSync("runs/latest/out/audit.jsonl")) {
        const auditLog = readFileSync("runs/latest/out/audit.jsonl", "utf-8");
        const violations = (auditLog.match(/CONSTRAINT_VIOLATION/g) || []).length;
        const injections = (auditLog.match(/INJECTION_DETECTED/g) || []).length;

        if (violations === 0) {
          console.log(`  ✅ Security passed - 0 violations, ${injections} injection attempts detected\n`);
          return { name, passed: true, message: `0 violations, ${injections} injections detected` };
        } else {
          console.log(`  ❌ Security failed - ${violations} violations detected\n`);
          return { name, passed: false, message: `${violations} violations detected` };
        }
      } else {
        console.log("  ⚠️  No audit log (security logging may not be enabled)\n");
        return { name, passed: true, message: "No audit log available" };
      }
    } else {
      // Regular negotiation test
      const dealReached = summary.dealReached || false;
      const responseTime = summary.tFirstDmSec || "N/A";

      console.log(`  ✅ Completed - Deal: ${dealReached}, Response time: ${responseTime}s\n`);
      return { name, passed: true, message: `Deal: ${dealReached}, Response time: ${responseTime}s` };
    }
  } catch (error) {
    console.log(`  ❌ Scenario failed\n`);
    return { name, passed: false, message: "Scenario execution failed" };
  }
}

async function main() {
  console.log("🧪 Running Validation Suite");
  console.log("==========================\n");

  const results: TestResult[] = [];

  // Test 1: Basic negotiation
  results.push(await runTest("Basic negotiation", "switch_basic", 120));

  // Test 2: Security - Prompt injection
  results.push(await runTest("Security - Prompt injection", "redteam_injection", 180));

  // Test 3: Quick deal
  results.push(await runTest("Quick deal", "iphone_quick_deal", 90));

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log("==========================");
  console.log("Validation Results:");
  console.log(`  Total tests: ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log("");

  if (failed === 0) {
    console.log("✅ All validation tests passed!");
    process.exit(0);
  } else {
    console.log(`❌ ${failed} tests failed`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
