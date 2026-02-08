#!/usr/bin/env tsx
import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const BEHAVIORS = {
  bargain_hunter:
    "You are a BARGAIN HUNTER. Always try to negotiate at least 20% off. Ask lots of questions about condition/flaws. Start low.",
  impulse_buyer:
    "You are an IMPULSE BUYER. If the item interests you and price seems reasonable, buy quickly without much negotiation.",
  quality_focused:
    "You are QUALITY FOCUSED. Will pay asking price if condition is excellent. Ask detailed questions about condition, accessories, proof of purchase.",
  cautious:
    "You are CAUTIOUS. Take time to decide. Ask many questions. Need reassurance. Willing to walk away if something feels off.",
};

const SELLER_BEHAVIORS = {
  firm: "You are FIRM. Stick to your asking price. Only negotiate if buyer seems serious.",
  flexible: "You are FLEXIBLE. Open to negotiation, but know your bottom line.",
  aggressive: "You are AGGRESSIVE. Push for quick sales, willing to drop price significantly.",
  friendly:
    "You are FRIENDLY. Build rapport, answer questions thoroughly, negotiate reasonably.",
  suspicious: "You are SUSPICIOUS. Ask lots of questions, verify buyer is serious.",
};

const BUYER_INTERESTS = {
  1: "Nintendo Switch, PS5, gaming consoles",
  2: "MacBook, iPad, Apple products",
  3: "iPhone, AirPods, smartphones",
  4: "Gaming PC, computer hardware",
};

async function spawnBuyers(count: number, options: { model?: string } = {}) {
  console.log(`[spawn_buyers] Spawning ${count} persistent buyer agents\n`);

  const env = loadBootstrapEnv();
  const model = options.model || "anthropic/claude-sonnet-4-5";

  const behaviorKeys = Object.keys(BEHAVIORS) as Array<keyof typeof BEHAVIORS>;

  for (let i = 1; i <= count; i++) {
    const behaviorKey = behaviorKeys[(i - 1) % behaviorKeys.length];
    const behaviorDesc = BEHAVIORS[behaviorKey];
    const interest = BUYER_INTERESTS[((i - 1) % 4) + 1 as 1 | 2 | 3 | 4];
    const profile = `live-buyer-${i}`;
    const port = 18810 + i;

    console.log(`[spawn_buyers] buyer ${i}: interests=(${interest}) - ${behaviorKey}`);

    // Configure agent (auth loaded from .local/bootstrap.env)
    await configureAgent(profile, {
      model,
      matrix: {
        homeserver: env.HOMESERVER,
        accessToken: env.BUYER_TOKEN, // from bootstrap.env
        userId: env.BUYER_MXID,
        roomId: env.ROOM_ID,
      },
    });

    // Spawn gateway
    await spawnGateway(profile, port, "live_buyers");

    // Give mission
    const mission = `PERSISTENT BUYER MISSION:

IDENTITY:
${behaviorDesc}

INTERESTS:
You are interested in: ${interest}

CONSTRAINTS:
- Budget: Up to 500€ (be flexible based on personality)
- Check #market:localhost every time you wake up
- Evaluate listings: do they match your interests?
- If interested AND price seems reasonable for your personality: DM the seller

ACTIONS:
1. Read recent messages in #market:localhost
2. Evaluate each listing:
   - Does it match my interests?
   - Is the price reasonable for my personality?
   - Should I contact the seller?
3. If yes: DM the seller directly (don't reply in market)
4. Negotiate based on your personality

IMPORTANT:
- Don't respond to every listing, only ones that genuinely interest you
- Be consistent with your personality (${behaviorKey})
- Make your own decisions, don't just follow patterns

REMEMBER: You're ${behaviorDesc.toLowerCase()}`;

    await sendMission(profile, mission);

    console.log(`[spawn_buyers] ✅ ${profile} running on port ${port}`);
  }

  console.log(`\n[spawn_buyers] ✅ Spawned ${count} buyer agents`);
}

async function spawnSellers(count: number, options: { model?: string } = {}) {
  console.log(`[spawn_sellers] Spawning ${count} persistent seller agents\n`);

  const env = loadBootstrapEnv();
  const model = options.model || "anthropic/claude-sonnet-4-5";

  const behaviorKeys = Object.keys(SELLER_BEHAVIORS) as Array<keyof typeof SELLER_BEHAVIORS>;

  const items = [
    { name: "Nintendo Switch OLED", price: 280, floor: 250 },
    { name: "MacBook Pro M1", price: 1200, floor: 1000 },
    { name: "iPhone 14 Pro", price: 900, floor: 800 },
    { name: "PlayStation 5", price: 450, floor: 400 },
  ];

  for (let i = 1; i <= count; i++) {
    const behaviorKey = behaviorKeys[(i - 1) % behaviorKeys.length];
    const behaviorDesc = SELLER_BEHAVIORS[behaviorKey];
    const item = items[(i - 1) % items.length];
    const profile = `live-seller-${i}`;
    const port = 18820 + i;

    console.log(`[spawn_sellers] seller ${i}: item=(${item.name}) - ${behaviorKey}`);

    // Configure agent (auth loaded from .local/bootstrap.env)
    await configureAgent(profile, {
      model,
      matrix: {
        homeserver: env.HOMESERVER,
        accessToken: env.SELLER_TOKEN, // from bootstrap.env
        userId: env.SELLER_MXID,
        roomId: env.ROOM_ID,
      },
    });

    // Spawn gateway
    await spawnGateway(profile, port, "live_sellers");

    // Give mission
    const mission = `PERSISTENT SELLER MISSION:

IDENTITY:
${behaviorDesc}

ITEM FOR SALE:
${item.name}
Asking price: ${item.price}€
Floor price (minimum you'll accept): ${item.floor}€

ACTIONS:
1. Post your listing to #market:localhost (once at startup)
2. Monitor for DM inquiries
3. Respond to questions about condition, specs, availability
4. Negotiate based on your personality (${behaviorKey})
5. Accept offers >= ${item.floor}€
6. Reject offers < ${item.floor}€

LISTING FORMAT:
"SELLING: ${item.name}. Price: ${item.price}€. [Add brief condition description]"

NEGOTIATION STYLE:
${behaviorDesc}

REMEMBER: Floor price is ${item.floor}€ - never go below this!`;

    await sendMission(profile, mission);

    console.log(`[spawn_sellers] ✅ ${profile} running on port ${port}`);
  }

  console.log(`\n[spawn_sellers] ✅ Spawned ${count} seller agents`);
}

async function stopAgents(type: "buyers" | "sellers" | "all") {
  console.log(`[stop] Stopping ${type} agents...`);

  const pattern = type === "all" ? "live-" : type === "buyers" ? "live-buyer-" : "live-seller-";

  try {
    execSync(`pkill -f "openclaw.*${pattern}"`, { stdio: "ignore" });
    console.log(`[stop] ✅ Stopped ${type} agents`);
  } catch (error) {
    console.log(`[stop] ℹ️  No ${type} agents running`);
  }
}

async function statusAgents() {
  console.log("🔍 Live Agents Status\n");

  try {
    const output = execSync(`ps aux | grep "openclaw.*live-" | grep -v grep`, {
      encoding: "utf-8",
    });
    const lines = output.trim().split("\n");
    console.log(`✅ ${lines.length} agents running:\n`);
    for (const line of lines) {
      const match = line.match(/--profile\s+(\S+)/);
      if (match) {
        console.log(`  - ${match[1]}`);
      }
    }
  } catch (error) {
    console.log("ℹ️  No agents running");
  }
}

function loadBootstrapEnv(): Record<string, string> {
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

  return env;
}

async function configureAgent(
  profile: string,
  options: {
    model: string;
    matrix: {
      homeserver: string;
      accessToken: string;
      userId: string;
      roomId: string;
    };
  }
) {
  // Set gateway mode
  execSync(`openclaw --profile ${profile} config set gateway.mode local`, { stdio: "ignore" });

  // Set model
  execSync(`openclaw --profile ${profile} config set agents.defaults.model.primary "${options.model}"`, {
    stdio: "ignore",
  });

  // Copy auth profiles from main agent
  const mainAuthFile = resolve(process.env.HOME || "~", ".openclaw/agents/main/agent/auth-profiles.json");
  const agentAuthDir = resolve(process.env.HOME || "~", `.openclaw-${profile}/agents/main/agent`);
  mkdirSync(agentAuthDir, { recursive: true });
  if (existsSync(mainAuthFile)) {
    execSync(`cp "${mainAuthFile}" "${agentAuthDir}/auth-profiles.json"`, { stdio: "ignore" });
  }

  // Enable Matrix plugin
  execSync(`openclaw --profile ${profile} config set plugins.entries.matrix.enabled true`, {
    stdio: "ignore",
  });

  // Configure Matrix channel
  const matrixConfig = {
    enabled: true,
    homeserver: options.matrix.homeserver,
    accessToken: options.matrix.accessToken,
    userId: options.matrix.userId,
    encryption: false,
    dm: { policy: "open", allowFrom: ["*"] },
    groupPolicy: "open",
    groups: {
      "*": { requireMention: false },
      [options.matrix.roomId]: { allow: true, requireMention: false },
    },
  };

  execSync(
    `openclaw --profile ${profile} config set --json 'channels.matrix' '${JSON.stringify(matrixConfig)}'`,
    { stdio: "ignore" }
  );
}

async function spawnGateway(profile: string, port: number, runId: string) {
  const logDir = `runs/${runId}/out`;
  mkdirSync(logDir, { recursive: true });

  const child = spawn("openclaw", ["--profile", profile, "gateway", "run", "--port", String(port)], {
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
  });

  child.unref();

  // Wait for startup
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function sendMission(profile: string, mission: string) {
  execSync(`openclaw --profile ${profile} system event "${mission.replace(/"/g, '\\"')}"`, {
    stdio: "ignore",
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const options: Record<string, any> = {};
  for (const arg of args.slice(1)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.substring(2).split("=");
      options[key] = value === undefined ? true : value;
    } else if (!isNaN(Number(arg))) {
      options.count = parseInt(arg, 10);
    }
  }

  switch (command) {
    case "buyers":
      await spawnBuyers(options.count || 2, { model: options.model });
      break;
    case "sellers":
      await spawnSellers(options.count || 2, { model: options.model });
      break;
    case "stop":
      await stopAgents(options.type || "all");
      break;
    case "status":
      await statusAgents();
      break;
    default:
      console.log("Usage: npm run cli:spawn-agents -- <command> [options]");
      console.log("");
      console.log("Commands:");
      console.log("  buyers [count] [--model=...]   Spawn buyer agents");
      console.log("  sellers [count] [--model=...]  Spawn seller agents");
      console.log("  stop [--type=buyers|sellers|all]  Stop agents");
      console.log("  status                          Show running agents");
      console.log("");
      console.log("Examples:");
      console.log("  npm run cli:spawn-agents -- buyers 3");
      console.log("  npm run cli:spawn-agents -- sellers 2 --model=anthropic/claude-3-5-haiku");
      console.log("  npm run cli:spawn-agents -- stop --type=buyers");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
