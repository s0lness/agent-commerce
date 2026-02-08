// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function run(cmd: string, args: string[] = [], opts: any = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: opts.env,
    stdio: opts.stdio || "inherit",
    encoding: opts.encoding || "utf8",
    timeout: opts.timeoutMs,
  });
  if (res.error) throw res.error;
  if ((res.status ?? 1) !== 0 && !opts.allowFail) {
    const out = [res.stdout || "", res.stderr || ""].join("\n").trim();
    throw new Error(`${cmd} ${args.join(" ")} failed (${res.status})${out ? `\n${out}` : ""}`);
  }
  return res;
}

export function runCapture(cmd: string, args: string[] = [], opts: any = {}): string {
  const res = run(cmd, args, { ...opts, stdio: "pipe", encoding: "utf8" });
  return (res.stdout || "").trim();
}

export function findOnPath(bin: string): string | null {
  const envPath = process.env.PATH || "";
  const parts = envPath.split(path.delimiter).filter(Boolean);
  for (const dir of parts) {
    const p = path.join(dir, bin);
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {}
  }
  return null;
}

export async function waitForPort(host: string, port: number, tries = 30, delayMs = 1000): Promise<boolean> {
  for (let i = 0; i < tries; i += 1) {
    const ok = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port });
      socket.setTimeout(1000);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (ok) return true;
    await sleep(delayMs);
  }
  return false;
}

export async function isPortInUse(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function pickFreePort(start: number): Promise<number> {
  let port = Number(start);
  while (await isPortInUse(port)) port += 1;
  return port;
}

export function nowRunId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("") + "_" +
    [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join("");
}

export function parseEnvLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    if (!/^[A-Z0-9_]+=/.test(line)) continue;
    const idx = line.indexOf("=");
    out[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return out;
}

export function writeEnvFile(file: string, envObj: Record<string, string>) {
  const lines = Object.entries(envObj).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
}

export function readEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  return parseEnvLines(fs.readFileSync(file, "utf8"));
}

export function appendJsonl(file: string, payload: unknown) {
  fs.appendFileSync(file, JSON.stringify(payload) + "\n", "utf8");
}

export function spawnToFile(cmd: string, args: string[], file: string, opts: any = {}) {
  const fd = fs.openSync(file, opts.append ? "a" : "w");
  return spawn(cmd, args, {
    cwd: opts.cwd,
    env: opts.env,
    stdio: ["ignore", fd, fd],
  });
}

export async function fetchJson(url: string, opts: any = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

export async function fetchRetry(url: string, opts: any = {}, retries = 5, sleepMs = 1000) {
  let lastErr: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(sleepMs);
  }
  throw lastErr || new Error(`request failed: ${url}`);
}

export function tailFile(file: string, lines = 120): string | null {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "utf8");
  return text.split(/\r?\n/).slice(-lines).join("\n");
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function hasDockerContainer(name: string): boolean {
  const out = runCapture("docker", ["ps", "--format", "{{.Names}}"], { allowFail: true });
  return out.split(/\r?\n/).includes(name);
}

export function encodeMxid(mxid: string): string {
  return encodeURIComponent(mxid);
}
