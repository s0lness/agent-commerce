import { Action, PolicyConfig, RawEvent } from "./types";

const STOPWORDS = new Set([
  "i",
  "want",
  "to",
  "a",
  "an",
  "the",
  "for",
  "my",
  "buy",
  "sell",
  "trade",
  "exchange",
  "dm",
  "me",
  "please",
  "looking",
  "seeking",
  "in",
  "on",
  "of",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9€$ ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t));
}

function hasWord(text: string, word: string): boolean {
  return text.toLowerCase().includes(word);
}

function overlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  let count = 0;
  for (const t of a) if (setB.has(t)) count++;
  return count;
}

function goalSide(goal: string): "buy" | "sell" | "trade" | "other" {
  const g = goal.toLowerCase();
  if (g.includes("buy")) return "buy";
  if (g.includes("sell")) return "sell";
  if (g.includes("trade") || g.includes("barter") || g.includes("exchange")) return "trade";
  return "other";
}

function msgSide(msg: string): "buy" | "sell" | "trade" | "other" {
  const m = msg.toLowerCase();
  if (m.includes("buy") || m.includes("looking for") || m.includes("want to buy")) return "buy";
  if (m.includes("sell") || m.includes("selling")) return "sell";
  if (m.includes("trade") || m.includes("barter") || m.includes("exchange")) return "trade";
  return "other";
}

export async function decideActions(
  agentId: string,
  goals: string[],
  event: RawEvent,
  policy: PolicyConfig
): Promise<Action[]> {
  if (event.from === agentId) return [];
  if (!event.body) return [];

  if (policy.kind === "basic") {
    return decideWithBasic(agentId, goals, event);
  }

  return [];
}

function decideWithBasic(agentId: string, goals: string[], event: RawEvent): Action[] {
  const actions: Action[] = [];
  const msgTokens = tokenize(event.body);
  const msgIntent = msgSide(event.body);

  for (const goal of goals) {
    const gTokens = tokenize(goal);
    const gSide = goalSide(goal);
    const matchScore = overlap(msgTokens, gTokens);
    if (matchScore === 0) continue;

    const complementary =
      (gSide === "buy" && msgIntent === "sell") ||
      (gSide === "sell" && msgIntent === "buy") ||
      (gSide === "trade" && msgIntent === "trade");

    if (!complementary) continue;

    const reply = `Hey, I saw your message. I'm interested. My goal: "${goal}". Want to discuss?`;
    actions.push({
      channel: "dm",
      to: event.from,
      body: reply,
    });
    break;
  }

  // If the message explicitly says "dm me", honor it even with low overlap.
  if (actions.length === 0 && hasWord(event.body, "dm me")) {
    actions.push({
      channel: "dm",
      to: event.from,
      body: "Hey, you said DM me. I'm interested. What are you looking for?",
    });
  }

  return actions;
}
