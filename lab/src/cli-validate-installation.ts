#!/usr/bin/env tsx
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

function check(name: string, fn: () => string): CheckResult {
  process.stdout.write(`Checking ${name}... `);
  try {
    const message = fn();
    console.log(`✅ ${message}`);
    return { name, passed: true, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    console.log(`❌ ${message}`);
    return { name, passed: false, message };
  }
}

function checkCommand(cmd: string, label: string): CheckResult {
  return check(label, () => {
    const output = execSync(cmd, { encoding: "utf-8" }).trim();
    return output;
  });
}

function checkFile(path: string): CheckResult {
  return check(path, () => {
    if (!existsSync(resolve(path))) {
      throw new Error(`Missing: ${path}`);
    }
    return "exists";
  });
}

async function main() {
  console.log("🔍 Validating clawlist-matrix-run installation...\n");

  const results: CheckResult[] = [];

  // Check Node.js
  results.push(checkCommand("node --version", "Node.js"));

  // Check npm
  results.push(checkCommand("npm --version", "npm"));

  // Check dependencies
  results.push(
    check("dependencies", () => {
      if (!existsSync("node_modules") || !existsSync("node_modules/.package-lock.json")) {
        throw new Error("Run: npm install");
      }
      return "Installed";
    })
  );

  // Check TypeScript build
  results.push(
    check("TypeScript build", () => {
      if (!existsSync("dist") || !existsSync("dist/run-scenario.js")) {
        throw new Error("Run: npm run build");
      }
      return "Built";
    })
  );

  // Check Docker
  results.push(checkCommand("docker --version", "Docker"));

  // Check Docker Compose
  results.push(
    check("Docker Compose", () => {
      execSync("docker compose version", { stdio: "ignore" });
      const version = execSync("docker compose version --short", { encoding: "utf-8" }).trim();
      return version;
    })
  );

  // Check OpenClaw CLI
  results.push(
    check("OpenClaw CLI", () => {
      const version = execSync("openclaw --version 2>&1 | head -1", {
        encoding: "utf-8",
        shell: "/bin/bash",
      }).trim();
      return version || "installed";
    })
  );

  // Run unit tests
  console.log("\nRunning unit tests...");
  results.push(
    check("unit tests", () => {
      execSync("npm test", { stdio: "inherit" });
      return "All tests passed";
    })
  );

  // Validate scenarios
  console.log("\nValidating scenarios...");
  results.push(
    check("scenario validation", () => {
      execSync("npm run validate", { stdio: "inherit" });
      return "All scenarios valid";
    })
  );

  // Check project structure
  console.log("\nChecking project structure...");
  const requiredFiles = [
    "package.json",
    "tsconfig.json",
    "Makefile",
    "README.md",
    "PLAN.md",
    "src/run-scenario.ts",
    "scenarios/switch_basic.json",
    "infra/docker-compose.yml",
  ];

  for (const file of requiredFiles) {
    results.push(checkFile(file));
  }

  // Summary
  const errors = results.filter((r) => !r.passed).length;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (errors === 0) {
    console.log("✅ Validation passed!");
    console.log("\nQuick start:");
    console.log("  make up           # Start infrastructure");
    console.log("  make bootstrap    # Create users + rooms");
    console.log("  make scenario SCENARIO=switch_basic");
    process.exit(0);
  } else {
    console.log(`❌ Validation failed with ${errors} errors`);
    console.log("\nFix the issues above and run again.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
