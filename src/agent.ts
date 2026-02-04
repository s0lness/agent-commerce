import fs from "fs";
import path from "path";
import sdk from "matrix-js-sdk";

// Polyfill for older Node runtimes that lack Promise.withResolvers
if (!(Promise as any).withResolvers) {
  (Promise as any).withResolvers = function () {
    let resolve: (value: unknown) => void;
    let reject: (reason?: unknown) => void;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

type AgentConfig = {
  baseUrl: string;
  userId: string;
  password: string;
  deviceId?: string;
  accessToken?: string;
  gossipRoomAlias?: string;
  gossipRoomId?: string;
  dmRoomId?: string;
  logDir: string;
};

type Command = "run" | "send" | "setup" | "scripted";

function getArg(args: string[], name: string): string | null {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function loadConfig(configPath: string): AgentConfig {
  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw) as AgentConfig;
}

function saveConfig(configPath: string, config: AgentConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

async function getClient(configPath: string) {
  const config = loadConfig(configPath);

  if (config.accessToken) {
    const client: any = sdk.createClient({
      baseUrl: config.baseUrl,
      accessToken: config.accessToken,
      userId: config.userId,
      deviceId: config.deviceId,
    });
    return { client, config };
  }

  const baseClient: any = sdk.createClient({ baseUrl: config.baseUrl });
  const loginRes = await baseClient.login("m.login.password", {
    user: config.userId,
    password: config.password,
    device_id: config.deviceId,
  });

  config.accessToken = loginRes.access_token;
  config.userId = loginRes.user_id;
  config.deviceId = loginRes.device_id;
  saveConfig(configPath, config);

  const client: any = sdk.createClient({
    baseUrl: config.baseUrl,
    accessToken: loginRes.access_token,
    userId: loginRes.user_id,
    deviceId: loginRes.device_id,
  });

  return { client, config };
}

function ensureLogDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function appendLog(logPath: string, line: string) {
  fs.appendFileSync(logPath, line);
}

async function runAgent(configPath: string) {
  const { client, config } = await getClient(configPath);
  ensureLogDir(config.logDir);

  let gossipRoomId = config.gossipRoomId ?? "";
  let dmRoomId = config.dmRoomId ?? "";

  client.on("Room.timeline", (event: any, room: any, toStartOfTimeline: boolean) => {
    if (toStartOfTimeline) return;
    if (event.getType() !== "m.room.message") return;
    const content = event.getContent();
    if (!content || content.msgtype !== "m.text") return;

    const body = String(content.body ?? "");
    const sender = String(event.getSender() ?? "unknown");
    const ts = new Date(event.getTs()).toISOString();
    const roomId = String(room?.roomId ?? "unknown");

    let logPath: string | null = null;
    if (roomId === gossipRoomId) logPath = path.join(config.logDir, "gossip.log");
    if (roomId === dmRoomId) logPath = path.join(config.logDir, "dm.log");
    if (!logPath) return;

    const line = `${ts} ${sender} ${roomId} ${body}\n`;
    appendLog(logPath, line);
  });

  client.on("sync", async (state: string) => {
    if (state !== "PREPARED") return;

    if (config.gossipRoomAlias && !gossipRoomId) {
      const joined = await client.joinRoom(config.gossipRoomAlias);
      gossipRoomId = typeof joined === "string" ? joined : joined.roomId;
    } else if (gossipRoomId) {
      await client.joinRoom(gossipRoomId);
    }

    if (dmRoomId) {
      await client.joinRoom(dmRoomId);
    }
  });

  client.startClient({ initialSyncLimit: 10 });
  console.log(`Agent running for ${config.userId}`);
}

async function sendMessage(configPath: string, roomKey: string, text: string) {
  const { client, config } = await getClient(configPath);

  let roomId = "";
  if (roomKey === "gossip") {
    roomId = config.gossipRoomId ?? "";
    if (!roomId && config.gossipRoomAlias) {
      const joined = await client.joinRoom(config.gossipRoomAlias);
      roomId = typeof joined === "string" ? joined : joined.roomId;
    }
  } else if (roomKey === "dm") {
    roomId = config.dmRoomId ?? "";
  }

  if (!roomId) {
    throw new Error(`Room not configured for ${roomKey}`);
  }

  await client.sendEvent(
    roomId,
    "m.room.message",
    { msgtype: "m.text", body: text },
    ""
  );
  console.log(`Sent to ${roomKey}: ${text}`);
}

async function setupRooms(configPathA: string, configPathB: string) {
  const { client, config: configA } = await getClient(configPathA);
  const configB = loadConfig(configPathB);

  const alias = configA.gossipRoomAlias ?? "#gossip:localhost";
  const aliasLocalpart = alias.split(":")[0].replace(/^#/, "");

  const gossipRoom = await client.createRoom({
    room_alias_name: aliasLocalpart,
    name: "gossip",
    visibility: "public",
    preset: "public_chat",
  });

  await client.invite(gossipRoom.room_id, configB.userId);

  const dmRoom = await client.createRoom({
    is_direct: true,
    invite: [configB.userId],
  });

  configA.gossipRoomId = gossipRoom.room_id;
  configB.gossipRoomId = gossipRoom.room_id;
  configA.dmRoomId = dmRoom.room_id;
  configB.dmRoomId = dmRoom.room_id;

  saveConfig(configPathA, configA);
  saveConfig(configPathB, configB);

  console.log("Setup complete");
  console.log(`gossipRoomId: ${gossipRoom.room_id}`);
  console.log(`dmRoomId: ${dmRoom.room_id}`);
}

async function scriptedSend(configPath: string, roomKey: string, scriptPath: string) {
  const { client, config } = await getClient(configPath);

  let roomId = "";
  if (roomKey === "gossip") {
    roomId = config.gossipRoomId ?? "";
    if (!roomId && config.gossipRoomAlias) {
      const joined = await client.joinRoom(config.gossipRoomAlias);
      roomId = typeof joined === "string" ? joined : joined.roomId;
    }
  } else if (roomKey === "dm") {
    roomId = config.dmRoomId ?? "";
  }

  if (!roomId) {
    throw new Error(`Room not configured for ${roomKey}`);
  }

  const raw = fs.readFileSync(scriptPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("sleep ")) {
      const ms = Number(trimmed.replace("sleep ", "").trim());
      if (!Number.isFinite(ms) || ms < 0) {
        throw new Error(`Invalid sleep duration: ${trimmed}`);
      }
      await new Promise((resolve) => setTimeout(resolve, ms));
      continue;
    }

    await client.sendEvent(
      roomId,
      "m.room.message",
      { msgtype: "m.text", body: trimmed },
      ""
    );
    console.log(`Sent: ${trimmed}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = (args[0] ?? "run") as Command;

  if (cmd === "run") {
    const configPath = getArg(args, "config");
    if (!configPath) throw new Error("--config is required");
    await runAgent(configPath);
    return;
  }

  if (cmd === "send") {
    const configPath = getArg(args, "config");
    const room = getArg(args, "room");
    const text = getArg(args, "text");
    if (!configPath || !room || !text) {
      throw new Error("--config, --room, and --text are required");
    }
    await sendMessage(configPath, room, text);
    return;
  }

  if (cmd === "setup") {
    const configA = getArg(args, "config-a");
    const configB = getArg(args, "config-b");
    if (!configA || !configB) {
      throw new Error("--config-a and --config-b are required");
    }
    await setupRooms(configA, configB);
    return;
  }

  if (cmd === "scripted") {
    const configPath = getArg(args, "config");
    const room = getArg(args, "room");
    const script = getArg(args, "script");
    if (!configPath || !room || !script) {
      throw new Error("--config, --room, and --script are required");
    }
    await scriptedSend(configPath, room, script);
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
