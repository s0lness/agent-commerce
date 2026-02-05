import http from "http";
import { URL } from "url";
import { RawEvent } from "./types";
import { logEvent } from "./log";

const DEFAULT_PORT = 3333;
const DEFAULT_HOST = "127.0.0.1";
const MAX_BODY_BYTES = 256 * 1024;

type Subscriber = http.ServerResponse;

function nowIso() {
  return new Date().toISOString();
}

function sseInit(res: http.ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.write("\n");
}

function sseSend(res: http.ServerResponse, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      raw += chunk.toString("utf8");
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
  });
}

export function startGateway(port?: number, host?: string) {
  const resolvedPort = port ?? DEFAULT_PORT;
  const resolvedHost = host ?? DEFAULT_HOST;
  const gossipSubscribers = new Set<Subscriber>();
  const dmSubscribers = new Map<string, Set<Subscriber>>();

  function addDmSubscriber(agentId: string, res: Subscriber) {
    if (!dmSubscribers.has(agentId)) dmSubscribers.set(agentId, new Set());
    dmSubscribers.get(agentId)!.add(res);
  }

  function removeSubscriber(set: Set<Subscriber> | undefined, res: Subscriber) {
    if (!set) return;
    set.delete(res);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ts: nowIso() }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/gossip") {
      try {
        const body = await parseBody(req);
        const event: RawEvent = {
          ts: nowIso(),
          channel: "gossip",
          from: String(body.from || "unknown"),
          body: String(body.body || ""),
          transport: "gateway",
        };
        logEvent(event);
        gossipSubscribers.forEach((sub) => sseSend(sub, "gossip", event));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/dm") {
      try {
        const body = await parseBody(req);
        if (!body.to) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "to is required" }));
          return;
        }
        const event: RawEvent = {
          ts: nowIso(),
          channel: "dm",
          from: String(body.from || "unknown"),
          to: String(body.to),
          body: String(body.body || ""),
          transport: "gateway",
        };
        logEvent(event);
        if (event.to) {
          const subs = dmSubscribers.get(event.to);
          if (subs) subs.forEach((sub) => sseSend(sub, "dm", event));
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/gossip/stream") {
      sseInit(res);
      gossipSubscribers.add(res);
      const heartbeat = setInterval(() => {
        sseSend(res, "ping", { ts: nowIso() });
      }, 25000);
      req.on("close", () => {
        clearInterval(heartbeat);
        removeSubscriber(gossipSubscribers, res);
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/dm/stream") {
      const agentId = url.searchParams.get("agent_id");
      if (!agentId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "agent_id required" }));
        return;
      }
      sseInit(res);
      addDmSubscriber(agentId, res);
      const heartbeat = setInterval(() => {
        sseSend(res, "ping", { ts: nowIso() });
      }, 25000);
      req.on("close", () => {
        clearInterval(heartbeat);
        removeSubscriber(dmSubscribers.get(agentId), res);
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(resolvedPort, resolvedHost, () => {
    console.log(`Gateway running on http://${resolvedHost}:${resolvedPort}`);
  });
}
