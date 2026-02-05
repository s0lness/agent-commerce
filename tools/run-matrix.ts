// @ts-nocheck
import path from "node:path";
import { spawnSync } from "node:child_process";
import { findOnPath } from "./matrixRun/common";

function run(cmd: string, args: string[], opts: any = {}): number {
  const res = spawnSync(cmd, args, { stdio: opts.stdio || "inherit", env: opts.env, cwd: opts.cwd });
  if (res.error) throw res.error;
  return res.status || 0;
}

function main() {
  const root = path.resolve(__dirname, "../");

  console.log("[run] checking docker");
  if (run("docker", ["info"], { stdio: "ignore" }) !== 0) {
    throw new Error("Docker is not running. Start Docker Desktop (or Docker service) and retry.");
  }

  console.log("[run] checking openclaw");
  const openclaw = process.env.OPENCLAW || findOnPath("openclaw");
  if (!openclaw) {
    throw new Error("openclaw not found in PATH and OPENCLAW not set. Install it, add to PATH, or run with OPENCLAW=/path/to/openclaw");
  }

  console.log("[run] starting matrix run harness");
  const rc = run("node", [path.join(root, "dist-tools", "matrixRun", "run.js")], {
    cwd: root,
    env: { ...process.env, OPENCLAW: openclaw },
  });
  process.exit(rc);
}

try {
  main();
} catch (err) {
  console.error((err as Error)?.message || String(err));
  process.exit(1);
}
