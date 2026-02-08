#!/usr/bin/env tsx
import { execSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const OPERATOR_PORT = 18795;

async function liveStart(options: { populate?: number } = {}) {
  console.log("[live] Starting live sandbox mode...\n");

  // 1. Start Matrix infra
  console.log("[live] 1/5 Starting Matrix infra...");
  execSync("make up", { stdio: "inherit" });

  // 2. Bootstrap users + market room
  console.log("\n[live] 2/5 Bootstrapping users and market room...");
  execSync("make bootstrap", { stdio: "inherit" });

  // 3. Set up operator bot config
  console.log("\n[live] 3/5 Configuring operator bot...");
  await operatorSetup();

  // 4. Start operator bot
  console.log("\n[live] 4/5 Starting operator bot...");
  const isRunning = await checkOperatorRunning();
  if (isRunning) {
    console.log("[live] operator bot already running");
  } else {
    await operatorUp();
  }

  // 5. Populate market (optional)
  if (options.populate && options.populate > 0) {
    console.log(`\n[live] 5/5 Populating market with ${options.populate} listings...`);
    await populateMarket(options.populate);
  } else {
    console.log("\n[live] 5/5 Skipping market population (use --populate=N)");
  }

  console.log("\n✅ Live mode started!");
  console.log("\n📺 Watch at: http://127.0.0.1:18080");
  console.log("💬 Control via Telegram: @clawnesstestbot");
  console.log("\nCommands:");
  console.log("  npm run cli:live -- status    # Check status");
  console.log("  npm run cli:live -- stop      # Stop live mode");
}

async function liveStop(options: { keepMatrix?: boolean } = {}) {
  console.log("[live] Stopping live sandbox mode...\n");

  // 1. Stop operator bot
  console.log("[live] Stopping operator bot...");
  try {
    execSync(`pkill -f "openclaw.*operator-bot"`, { stdio: "ignore" });
    console.log("✅ Operator bot stopped");
  } catch (error) {
    console.log("ℹ️  Operator bot not running");
  }

  // 2. Stop spawned agents
  console.log("[live] Stopping spawned agents...");
  try {
    execSync(`pkill -f "openclaw.*live-"`, { stdio: "ignore" });
    console.log("✅ Spawned agents stopped");
  } catch (error) {
    console.log("ℹ️  No spawned agents running");
  }

  // 3. Stop Matrix (optional)
  if (!options.keepMatrix) {
    console.log("[live] Stopping Matrix infra...");
    execSync("make down", { stdio: "inherit" });
  } else {
    console.log("[live] Keeping Matrix running (use --no-keep-matrix to stop)");
  }

  console.log("\n✅ Live mode stopped");
}

async function liveStatus() {
  console.log("🔍 Live Mode Status\n");

  let allGood = true;

  // Check Matrix
  process.stdout.write("Synapse: ");
  try {
    execSync("curl -sf http://127.0.0.1:18008/_matrix/client/versions", { stdio: "ignore" });
    console.log("✅ Running");
  } catch (error) {
    console.log("❌ Not running (run: make up)");
    allGood = false;
  }

  // Check Element Web
  process.stdout.write("Element Web: ");
  try {
    execSync("curl -sf http://127.0.0.1:18080", { stdio: "ignore" });
    console.log("✅ Running at http://127.0.0.1:18080");
  } catch (error) {
    console.log("❌ Not accessible");
    allGood = false;
  }

  // Check operator bot
  process.stdout.write("Operator bot: ");
  const operatorRunning = await checkOperatorRunning();
  if (operatorRunning) {
    console.log("✅ Running");
  } else {
    console.log("❌ Not running (run: npm run cli:live -- start)");
    allGood = false;
  }

  // Check market room
  process.stdout.write("Market room: ");
  if (existsSync(".local/bootstrap.env")) {
    console.log("✅ Bootstrapped");
  } else {
    console.log("❌ Not bootstrapped (run: make bootstrap)");
    allGood = false;
  }

  console.log("");
  if (allGood) {
    console.log("✅ All systems operational");
  } else {
    console.log("⚠️  Some systems need attention");
  }
}

async function checkOperatorRunning(): Promise<boolean> {
  try {
    execSync(`curl -sf http://127.0.0.1:${OPERATOR_PORT}`, { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

async function operatorSetup() {
  // Load bootstrap environment
  if (!existsSync(".local/bootstrap.env")) {
    throw new Error("Bootstrap environment not found. Run: make bootstrap");
  }

  const bootstrapEnv = readFileSync(".local/bootstrap.env", "utf-8");
  const env: Record<string, string> = {};
  for (const line of bootstrapEnv.split("\n")) {
    const match = line.match(/^export\s+(\w+)="([^"]*)"/);
    if (match) {
      env[match[1]] = match[2];
    }
  }

  // Load credentials from .local/bootstrap.env (gitignored)
  const operatorMxid = env.OPERATOR_MXID || "@operator:localhost";
  const operatorAuth = env.OPERATOR_TOKEN; // loaded from local env
  const homeserver = env.HOMESERVER || "http://127.0.0.1:18008";
  const roomId = env.ROOM_ID;

  if (!operatorAuth || !roomId) {
    throw new Error("Missing OPERATOR_TOKEN or ROOM_ID in bootstrap.env");
  }

  console.log(`[operator_setup] Configuring operator-bot profile...`);
  console.log(`[operator_setup] Matrix user: ${operatorMxid}`);

  const profile = "operator-bot";

  // Set gateway mode
  execSync(`openclaw --profile ${profile} config set gateway.mode local`, { stdio: "ignore" });

  // Set model
  const model = "anthropic/claude-sonnet-4-5";
  execSync(`openclaw --profile ${profile} config set agents.defaults.model.primary "${model}"`, {
    stdio: "ignore",
  });

  // Enable Matrix plugin
  execSync(`openclaw --profile ${profile} config set plugins.entries.matrix.enabled true`, {
    stdio: "ignore",
  });

  // Configure Matrix channel
  const matrixConfig = {
    enabled: true,
    homeserver: homeserver,
    accessToken: operatorAuth,
    userId: operatorMxid,
    encryption: false,
    dm: { policy: "open", allowFrom: ["*"] },
    groupPolicy: "open",
    groups: {
      "*": { requireMention: true },
      [roomId]: { allow: true, requireMention: true },
    },
  };

  execSync(
    `openclaw --profile ${profile} config set --json 'channels.matrix' '${JSON.stringify(matrixConfig)}'`,
    { stdio: "ignore" }
  );

  // Configure Telegram (if credentials exist)
  const telegramCredsPath = resolve(process.env.HOME || "~", ".config/moltbook/credentials.json");
  if (existsSync(telegramCredsPath)) {
    // Telegram config would go here, but we're keeping it simple for now
  }

  console.log(`[operator_setup] ✅ operator-bot configured`);
}

async function operatorUp() {
  const profile = "operator-bot";
  const runId = "operator";
  const port = OPERATOR_PORT;

  console.log(`[operator_up] Starting operator bot on port ${port}...`);

  const logDir = `runs/${runId}/out`;
  execSync(`mkdir -p ${logDir}`, { stdio: "ignore" });

  const child = spawn("openclaw", ["--profile", profile, "gateway", "run", "--port", String(port)], {
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
  });

  child.unref();

  // Wait for startup
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const isRunning = await checkOperatorRunning();
  if (isRunning) {
    console.log(`[operator_up] ✅ Operator bot running on port ${port}`);
  } else {
    throw new Error("Operator bot failed to start");
  }
}

async function populateMarket(count: number) {
  console.log(`[populate] Populating market with ${count} static listings...`);

  // Load bootstrap environment
  if (!existsSync(".local/bootstrap.env")) {
    throw new Error("Bootstrap environment not found");
  }

  const bootstrapEnv = readFileSync(".local/bootstrap.env", "utf-8");
  const env: Record<string, string> = {};
  for (const line of bootstrapEnv.split("\n")) {
    const match = line.match(/^export\s+(\w+)="([^"]*)"/);
    if (match) {
      env[match[1]] = match[2];
    }
  }

  const homeserver = env.HOMESERVER || "http://127.0.0.1:18008";
  const sellerAuth = env.SELLER_TOKEN; // loaded from local env
  const roomId = env.ROOM_ID;

  if (!sellerAuth || !roomId) {
    throw new Error("Missing SELLER_TOKEN or ROOM_ID");
  }

  const listings = [
    "SELLING: Nintendo Switch OLED. Price: 280€. Excellent condition, barely used.",
    "SELLING: Nintendo Switch v2. Price: 220€. Good condition, includes case.",
    "SELLING: Nintendo Switch Lite. Price: 150€. Works perfectly, minor scratches.",
    "SELLING: MacBook Pro M1 13\". Price: 1200€. 16GB RAM, 512GB SSD. Like new.",
    "SELLING: iPhone 14 Pro. Price: 900€. 256GB, space black. Perfect condition.",
    "SELLING: PlayStation 5. Price: 450€. Disc edition, original box.",
    "SELLING: iPad Air M1. Price: 500€. 64GB, WiFi. Mint condition.",
    "SELLING: AirPods Pro 2nd gen. Price: 200€. Sealed, never opened.",
  ];

  for (let i = 0; i < Math.min(count, listings.length); i++) {
    const message = listings[i];

    execSync(
      `curl -sf -X PUT "${homeserver}/_matrix/client/r0/rooms/${roomId}/send/m.room.message/$(uuidgen)" ` +
        `-H "Authorization: Bearer ${sellerAuth}" ` +
        `-H "Content-Type: application/json" ` +
        `-d '{"msgtype":"m.text","body":"${message}"}'`,
      { stdio: "ignore" }
    );

    console.log(`[populate] ${i + 1}/${count}: ${message.substring(0, 60)}...`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`[populate] ✅ Posted ${Math.min(count, listings.length)} listings`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const options: Record<string, any> = {};
  for (const arg of args.slice(1)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      options[key] = value === undefined ? true : value;
    }
  }

  switch (command) {
    case "start":
      await liveStart({
        populate: options.populate ? parseInt(options.populate, 10) : undefined,
      });
      break;
    case "stop":
      await liveStop({ keepMatrix: options.keepMatrix });
      break;
    case "status":
      await liveStatus();
      break;
    default:
      console.log("Usage: npm run cli:live -- <command> [options]");
      console.log("");
      console.log("Commands:");
      console.log("  start [--populate=N]  Start live mode (optionally populate with N listings)");
      console.log("  stop [--keep-matrix]  Stop live mode (optionally keep Matrix running)");
      console.log("  status                Check live mode status");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
