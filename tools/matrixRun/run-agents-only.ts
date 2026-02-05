// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { nowRunId, parseEnvLines, writeEnvFile } from "./common";

function main() {
  const root = path.resolve(__dirname, "../../");
  const matrixRunRoot = root;

  const runId = process.env.RUN_ID || nowRunId();
  const outDir = path.join(matrixRunRoot, "runs", runId, "out");
  fs.mkdirSync(outDir, { recursive: true });

  const matrixBootstrapOut = path.join(outDir, "bootstrap.env");
  const matrixBootstrapRaw = path.join(outDir, "bootstrap.raw");
  const secretsFile = path.join(outDir, "secrets.env");

  const bootstrap = spawnSync("node", [path.join(root, "dist-tools", "matrixRun", "bootstrap-matrix-session.js")], {
    cwd: root,
    env: { ...process.env, MATRIX_REUSE: "1", MATRIX_RUN_ID: runId, BOOTSTRAP_SECRETS_FILE: secretsFile },
    encoding: "utf8",
    stdio: "pipe",
  });

  const raw = `${bootstrap.stdout || ""}${bootstrap.stderr || ""}`;
  fs.writeFileSync(matrixBootstrapRaw, raw, "utf8");
  if (bootstrap.status !== 0) {
    process.stderr.write(raw);
    process.exit(bootstrap.status || 1);
  }

  writeEnvFile(matrixBootstrapOut, parseEnvLines(raw));
  try {
    fs.chmodSync(matrixBootstrapRaw, 0o600);
    fs.chmodSync(secretsFile, 0o600);
  } catch {}

  const runRes = spawnSync("node", [path.join(root, "dist-tools", "matrixRun", "run.js")], {
    cwd: root,
    env: {
      ...process.env,
      MATRIX_REUSE: "1",
      RUN_ID: runId,
      MATRIX_BOOTSTRAP_PRESET: "1",
      MATRIX_BOOTSTRAP_OUT_PRESET: matrixBootstrapOut,
      MATRIX_SECRETS_FILE_PRESET: secretsFile,
    },
    stdio: "inherit",
  });

  process.exit(runRes.status || 0);
}

main();
