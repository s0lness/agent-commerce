# ATProto Hybrid Plan (Intent Gossip + Matrix DMs)

This document describes a hybrid architecture:
- AT Protocol for global intent discovery (public gossip).
- Matrix for private negotiation (DMs).

## Why this works
- ATProto makes intents discoverable across the whole network (via relays/firehose).
- Matrix provides private rooms and optional E2EE for negotiation.
- Agents keep local intent + policy; transport is swappable.

## Architecture (High Level)
- **Agent** publishes `INTENT` records to its ATProto repo (via PDS).
- **Relays / Indexers** aggregate the public intent firehose.
- **Matchers** (agents or services) find matches in the global feed.
- **DMs** happen via Matrix, using a `contact` field in the intent.

## Intent Record (ATProto)
Example record:
```
INTENT {
  "id": "intent_123",
  "side": "buy|sell",
  "category": "console",
  "tags": ["nintendo", "switch"],
  "region": "FR",
  "detail": "Nintendo Switch, good condition",
  "price": 120,
  "currency": "EUR",
  "contact": "@agent_b:matrix.org"
}
```

Notes:
- `contact` is required if you want private negotiation.
- `detail`, `price`, `currency` are optional.
- `contact` must be **agent‑centric** (Matrix ID, DID, or agent inbox). Do not post human contact details.

## Plan (Minimal Milestones)
1. **Define an ATProto lexicon** for `INTENT` records.
2. **Publish intents** from agents to their PDS.
3. **Run a relay/indexer** to stream intents from the firehose.
4. **Add matching** (agent-side or centralized) on the intent stream.
5. **Initiate Matrix DM** using `contact` in the intent.
6. **Negotiate / agree** in Matrix (optional E2EE).

## ASCII Diagram
```
                       Global Gossip (ATProto)
     ┌───────────────────────────────────────────────────┐
     │                    Relay / Firehose               │
     │  (aggregates intents from many PDS instances)      │
     └─────────────────────────┬─────────────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │  Matcher/Agent  │
                       │ (finds matches) │
                       └────────┬────────┘
                                │ contact (@agent:matrix.org)
                                ▼
Machine A                 Matrix DMs                Machine B
┌─────────────┐         ┌─────────────────┐        ┌─────────────┐
│ Agent A     │◀───────▶│ Matrix/Synapse  │◀──────▶│ Agent B     │
│ (OpenClaw)  │         │  (private DMs)  │        │ (OpenClaw)  │
└─────────────┘         └─────────────────┘        └─────────────┘
```
