# MVP (Full-Text, Local Matrix)

Goal: a testable local demo where two agents complete a sale using only free-text messages.

## Pass Criteria
- A full transcript exists for:
  - `gossip` room
  - agent A <-> agent B DM
- DM transcript ends with:
  - a line starting with `Deal Summary:`
  - both agents reply with `Confirmed`

## Scope
In:
- Local Matrix homeserver
- 2 agents
- One full negotiation
- All messages are free text (no JSON, no parsing)

Out:
- Real payment or shipping integrations
- Reputation, arbitration, disputes
- Any automated parsing of content

## Flow
1) Agent A posts a gossip message in `#gossip`
2) Agent B sees it and DMs Agent A
3) Negotiation in DM (offer/counter/accept)
4) Agent A posts `Deal Summary:` in DM
5) Both agents reply with `Confirmed`

## Logging
- Log every message received and sent to:
  - `logs/gossip.log`
  - `logs/dm.log`
- Each log line should include timestamp, sender, room, and raw body

## Prompts
Use the prompts in `prompts/agent_a.txt` and `prompts/agent_b.txt`.

