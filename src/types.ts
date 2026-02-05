export type Channel = "gossip" | "dm";

export type RawEvent = {
  ts: string;
  channel: Channel;
  from: string;
  to?: string;
  body: string;
  transport: "gateway";
};

export type PolicyConfig =
  | {
      kind: "none";
    }
  | {
      kind: "basic";
    };

export type AgentConfig = {
  agent_id: string;
  gateway_url: string;
  goals: string[];
  policy?: PolicyConfig;
};

export type Action = {
  channel: Channel;
  to?: string;
  body: string;
};
