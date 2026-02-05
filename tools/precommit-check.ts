// @ts-nocheck
import { spawnSync } from "node:child_process";

function git(args: string[]): string {
  const res = spawnSync("git", args, { encoding: "utf8", stdio: "pipe" });
  if (res.error) throw res.error;
  if ((res.status || 0) !== 0) throw new Error(res.stderr || `git ${args.join(" ")} failed`);
  return (res.stdout || "").trim();
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]).split(/\r?\n/).filter(Boolean);
if (staged.length === 0) process.exit(0);

const blockedPatterns: RegExp[] = [
  /^logs\//,
  /^runs\//,
  /^\.local\//,
  /^out\//,
  /^config\/agent_.*\.json$/,
  /^config\/scenario\.local\.json$/,
  /\.env(\..+)?$/,
  /secrets\.env$/,
];

const blocked = staged.filter((f) => blockedPatterns.some((p) => p.test(f)));
if (blocked.length > 0) {
  fail(["Blocked commit: local/internal artifacts are staged:", ...blocked.map((f) => `  - ${f}`), "Use tracked templates (e.g. config/*.example.json) and keep runtime outputs untracked."].join("\n"));
}

const diff = git(["diff", "--cached", "--unified=0", "--no-color"]);
const added = diff.split(/\r?\n/).filter((l) => /^\+[^+]/.test(l)).join("\n");
const filtered = added.split(/\r?\n/).filter((l) => !/(changeme|your_token|token-switch-seller|token-switch-buyer|example_token|dummy_token)/i.test(l)).join("\n");

const secretRe = /(Authorization:\s*Bearer\s+[A-Za-z0-9._-]{16,}|syt_[A-Za-z0-9._=-]{16,}|(SELLER_TOKEN|BUYER_TOKEN|access_token|openclaw_token|password)\s*[:=]\s*['"]?[A-Za-z0-9._=-]{16,})/i;
if (secretRe.test(filtered)) {
  const lines = filtered.split(/\r?\n/).filter((l) => secretRe.test(l));
  fail(["Blocked commit: possible secret/token content in staged diff:", ...lines.map((l) => `  ${l}`), "If this is intentional test data, replace with placeholders like 'changeme'."].join("\n"));
}
