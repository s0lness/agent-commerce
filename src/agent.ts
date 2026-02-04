import fs from "fs";
import path from "path";
import sdk from "matrix-js-sdk";
import { spawn } from "child_process";

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
  promptPath?: string;
  openclawCmd?: string;
};

type Command = "send" | "setup" | "scripted" | "auth" | "bridge";

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

function loadMatchFile(matchFile: string): RegExp | null {
  try {
    const raw = fs.readFileSync(matchFile, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    if (!lines.length) return null;
    const pattern = lines.map((line) => line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
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

  if (roomKey === "dm") {
    await client.joinRoom(roomId);
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
  ensureLogDir(config.logDir);

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

  if (roomKey === "dm") {
    await client.joinRoom(roomId);
  }

  const raw = fs.readFileSync(scriptPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const logPath =
    roomKey === "gossip"
      ? path.join(config.logDir, "gossip.log")
      : path.join(config.logDir, "dm.log");

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
    const ts = new Date().toISOString();
    const sender = config.userId;
    appendLog(logPath, `${ts} ${sender} ${roomId} ${trimmed}\n`);
    console.log(`Sent: ${trimmed}`);
  }
}

async function runBridge(
  configPath: string,
  sessionId: string,
  match?: string,
  matchFile?: string,
  roomMode: "gossip" | "dm" | "both" = "both"
) {
  const { client, config } = await getClient(configPath);
  const openclawCmd = config.openclawCmd ?? process.env.OPENCLAW_CMD ?? "openclaw";
  const startTs = Date.now() - 1000;
  let gossipRoomId = config.gossipRoomId ?? "";
  let dmRoomId = config.dmRoomId ?? "";

  const matcher = match ? new RegExp(match, "i") : null;
  const debug = process.env.BRIDGE_DEBUG === "1";
  let dmSeen = false;
  let busy = false;

  client.on("Room.timeline", async (event: any, room: any, toStartOfTimeline: boolean) => {
    if (toStartOfTimeline) return;
    if (event.getTs && event.getTs() < startTs) return;
    if (event.getType() !== "m.room.message") return;
    const content = event.getContent();
    if (!content || content.msgtype !== "m.text") return;

    const body = String(content.body ?? "");
    const sender = String(event.getSender() ?? "unknown");
    const roomId = String(room?.roomId ?? "unknown");

    if (sender === config.userId) return;
    const isGossip = roomId === gossipRoomId;
    const isDm = roomId === dmRoomId;
    if (!isGossip && !isDm) return;
    if (isDm) dmSeen = true;
    if (debug) {
      console.log(`[bridge] message room=${roomId} sender=${sender} gossip=${isGossip} dm=${isDm} body="${body}"`);
    }
    if (
      roomMode !== "both" &&
      ((roomMode === "gossip" && !isGossip) || (roomMode === "dm" && !isDm))
    ) {
      return;
    }
    if (isGossip) {
      if (dmSeen) return;
      const fileMatcher = matchFile ? loadMatchFile(matchFile) : null;
      if (matcher && !matcher.test(body)) return;
      if (fileMatcher && !fileMatcher.test(body)) return;
      if (!matcher && matchFile && !fileMatcher) return;
    }
    if (busy) return;

    busy = true;
    const prompt = isGossip
      ? `GOSSIP MESSAGE from ${sender}: ${body}\nIf you should respond, reply with one line in this format:\n- DM: <message>\n- GOSSIP: <message>\nIf you should not respond, reply exactly with SKIP.`
      : `DM MESSAGE from ${sender}: ${body}\nReply with one line in this format:\n- DM: <message>\nIf you should not respond, reply exactly with SKIP.`;

    try {
      const reply = await new Promise<string>((resolve, reject) => {
        const args = ["agent"];
        if (sessionId) {
          args.push("--session-id", sessionId);
        }
        args.push("--message", prompt);
        const child = spawn(openclawCmd, args, {
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        let errOut = "";
        child.stdout.on("data", (chunk) => {
          output += chunk.toString("utf8");
        });
        child.stderr.on("data", (chunk) => {
          errOut += chunk.toString("utf8");
        });
        child.on("exit", (code) => {
          if (code === 0) {
            const lines = output
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean);
            resolve(lines[lines.length - 1] ?? "");
          } else {
            reject(new Error(`openclaw agent exited with code ${code ?? "unknown"}: ${errOut}`));
          }
        });
      });

      if (debug) {
        console.log(`[bridge] reply="${reply}"`);
      }
      if (!reply || reply.toUpperCase() === "SKIP") return;

      const prefix = reply.split(":")[0]?.toUpperCase();
      const message = reply.includes(":") ? reply.slice(reply.indexOf(":") + 1).trim() : "";
      if (!message) return;

      if (prefix === "GOSSIP") {
        if (!gossipRoomId) return;
        await client.sendEvent(
          gossipRoomId,
          "m.room.message",
          { msgtype: "m.text", body: message },
          ""
        );
        const ts = new Date().toISOString();
        appendLog(path.join(config.logDir, "gossip.log"), `${ts} ${config.userId} ${gossipRoomId} ${message}\n`);
        if (debug) console.log(`[bridge] sent gossip="${message}"`);
      } else if (prefix === "DM") {
        if (!dmRoomId) return;
        await client.joinRoom(dmRoomId);
        await client.sendEvent(
          dmRoomId,
          "m.room.message",
          { msgtype: "m.text", body: message },
          ""
        );
        const ts = new Date().toISOString();
        appendLog(path.join(config.logDir, "dm.log"), `${ts} ${config.userId} ${dmRoomId} ${message}\n`);
        if (debug) console.log(`[bridge] sent dm="${message}"`);
      }
    } catch (err) {
      console.error("OpenClaw bridge failed:", err);
    } finally {
      busy = false;
    }
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

  client.startClient({ initialSyncLimit: 0 });
  console.log(
    `Bridge running for ${config.userId} -> OpenClaw session ${sessionId} (rooms: ${roomMode})`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] as Command | undefined;
  if (!cmd) {
    throw new Error("Command required: send | setup | scripted | auth | bridge");
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

  if (cmd === "auth") {
    const configPath = getArg(args, "config");
    if (!configPath) throw new Error("--config is required");
    await getClient(configPath);
    console.log("Auth complete");
    return;
  }

  if (cmd === "bridge") {
    const configPath = getArg(args, "config");
    const sessionId = getArg(args, "session");
    const match = getArg(args, "match");
    const matchFile = getArg(args, "match-file");
    const room = (getArg(args, "room") ?? "both") as "gossip" | "dm" | "both";
    if (!configPath || !sessionId) {
      throw new Error("--config and --session are required");
    }
    await runBridge(configPath, sessionId, match ?? undefined, matchFile ?? undefined, room);
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
