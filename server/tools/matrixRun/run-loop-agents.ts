// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { nowRunId, tailFile } from "./common";

function summarize(outDir: string) {
  const steps = path.join(outDir, "steps.jsonl");
  console.log("--- recap ---");
  console.log(`out_dir=${outDir}`);

  if (fs.existsSync(steps)) {
    const lines = fs.readFileSync(steps, "utf8").trim().split(/\r?\n/).filter(Boolean);
    const last = lines[lines.length - 1] || "";
    console.log(`last_step=${last}`);
    const err = lines.map((l, i) => ({ l, i: i + 1 })).filter((x) => x.l.includes('"status":"error"')).slice(-1)[0];
    if (err) console.log(`error=${err.i}:${err.l}`);
  } else {
    console.log("no steps.jsonl");
  }

  for (const f of ["gateway_switch-seller.log", "gateway_switch-buyer.log", "synapse.log"]) {
    const p = path.join(outDir, f);
    const tail = tailFile(p, 12);
    if (tail != null) {
      console.log(`tail: ${p}`);
      for (const line of tail.split(/\r?\n/)) console.log(`  ${line}`);
    }
  }

  if (fs.existsSync(steps)) {
    const text = fs.readFileSync(steps, "utf8");
    if (text.includes('"step":"validate_tokens"') && text.includes('"status":"error"')) {
      console.log("suggestion: token check failed -> inspect secrets.env and Authorization header.");
      return;
    }
    if (text.includes('"step":"verify_market"') && text.includes('"status":"error"')) {
      console.log("suggestion: seller listing too slow -> strengthen seller mission or fallback listing.");
      return;
    }
    if (text.includes('"step":"verify_dm"') && text.includes('"status":"error"')) {
      console.log("suggestion: DM not detected -> inspect DM routing and verification heuristic.");
      return;
    }
  }
  console.log("suggestion: check the last failing step and corresponding log tail above.");
}

function main() {
  const root = path.resolve(__dirname, "../../");
  const matrixRunRoot = root;
  const attempts = Number(process.env.ATTEMPTS || 50);
  const runMinutes = Number(process.env.RUN_MINUTES || 2);

  spawnSync("node", [path.join(root, "dist-tools", "matrixRun", "matrix-up.js")], {
    cwd: root,
    env: process.env,
    stdio: "ignore",
  });

  for (let i = 1; i <= attempts; i += 1) {
    console.log(`=== ATTEMPT ${i}/${attempts} ===`);
    const runId = `${nowRunId()}_a${i}`;
    const res = spawnSync("node", [path.join(root, "dist-tools", "matrixRun", "run-agents-only.js")], {
      cwd: root,
      env: { ...process.env, RUN_ID: runId, MATRIX_REUSE: "1", RUN_MINUTES: String(runMinutes) },
      stdio: "inherit",
    });

    summarize(path.join(matrixRunRoot, "runs", runId, "out"));

    if ((res.status || 1) === 0) {
      console.log(`GREEN on attempt ${i}`);
      process.exit(0);
    }

    console.log(`attempt ${i} failed (rc=${res.status || 1})`);
  }

  console.log(`gave up after ${attempts}`);
  process.exit(1);
}

main();
