// @ts-nocheck
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(__dirname, "../../");

function runNode(script: string, env: NodeJS.ProcessEnv) {
  const res = spawnSync("node", [script], {
    cwd: root,
    env,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) throw res.error;
  if ((res.status ?? 1) !== 0) throw new Error(`${script} failed with code ${res.status}`);
}

function main() {
  const env = { ...process.env };
  runNode(path.join(root, "dist-tools", "matrixRun", "matrix-up.js"), env);
  runNode(path.join(root, "dist-tools", "matrixRun", "bootstrap-matrix-session.js"), env);
}

try {
  main();
} catch (err) {
  console.error((err as Error)?.message || String(err));
  process.exit(1);
}
