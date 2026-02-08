import http from "http";
import https from "https";
import { URL } from "url";

export function postJson(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  timeoutMs = 5000
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);

    const req = client.request(
      {
        method: "POST",
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk.toString("utf8");
        });
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, text: data });
        });
      }
    );

    if (timeoutMs > 0) {
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });
    }
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
