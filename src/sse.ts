import http from "http";
import https from "https";
import { URL } from "url";

export type SseHandler = (event: string, data: any) => void;

export function startSse(url: string, onEvent: SseHandler) {
  const target = new URL(url);
  const client = target.protocol === "https:" ? https : http;

  const req = client.request(
    {
      method: "GET",
      hostname: target.hostname,
      port: target.port,
      path: target.pathname + target.search,
      headers: {
        Accept: "text/event-stream",
      },
    },
    (res) => {
      res.setEncoding("utf8");
      let buffer = "";
      res.on("data", (chunk: string) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = raw.split(/\r?\n/);
          let eventName = "message";
          let dataLine = "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.slice("event:".length).trim();
            } else if (line.startsWith("data:")) {
              dataLine += line.slice("data:".length).trim();
            }
          }
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine);
            onEvent(eventName, payload);
          } catch {
            // Ignore malformed events.
          }
        }
      });
    }
  );

  req.on("error", () => {});
  req.end();
}
