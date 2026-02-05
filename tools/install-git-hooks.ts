// @ts-nocheck
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../");
const hookDir = path.join(root, ".git", "hooks");
const hookFile = path.join(hookDir, "pre-commit");

fs.mkdirSync(hookDir, { recursive: true });
fs.writeFileSync(hookFile, `#!/usr/bin/env bash
set -euo pipefail

if [ ! -f dist-tools/precommit-check.js ]; then
  npm run build >/dev/null
fi
node dist-tools/precommit-check.js
`, "utf8");
fs.chmodSync(hookFile, 0o755);
console.log(`Installed pre-commit hook at ${hookFile}`);
