import { httpRequest } from "../http";
import { startSse } from "../sse";
import { Action, RawEvent } from "../types";
import { MessageHandler, Transport } from "../transport";

export class GatewayTransport implements Transport {
  private baseUrl: string;
  private agentId: string;

  constructor(baseUrl: string, agentId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.agentId = agentId;
  }

  start(onMessage: MessageHandler): void {
    startSse(`${this.baseUrl}/gossip/stream`, (event, payload) => {
      if (event !== "gossip") return;
      onMessage(payload as RawEvent);
    });

    startSse(
      `${this.baseUrl}/dm/stream?agent_id=${encodeURIComponent(this.agentId)}`,
      (event, payload) => {
        if (event !== "dm") return;
        onMessage(payload as RawEvent);
      }
    );
  }

  send(action: Action): void {
    if (action.channel === "gossip") {
      httpRequest(`${this.baseUrl}/gossip`, "POST", {
        from: this.agentId,
        body: action.body,
      }).catch(() => {});
      return;
    }

    httpRequest(`${this.baseUrl}/dm`, "POST", {
      from: this.agentId,
      to: action.to,
      body: action.body,
    }).catch(() => {});
  }
}
