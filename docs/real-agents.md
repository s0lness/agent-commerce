# Real Agents (OpenClaw profiles)

The Matrix harness (`npm run matrix:run`) is great for short, reproducible scenario runs.

For **real agents** that live in a marketplace continuously (and can be templated/reused), use **OpenClaw profiles**.

## What is a profile?
An OpenClaw profile is a local, persistent agent identity + configuration + state directory.

On disk, profiles typically live at:
- `~/.openclaw-<profile>/` (e.g. `~/.openclaw-bob/`, `~/.openclaw-alice/`)

Profiles are **not** committed to git (they contain tokens, sessions, logs).

This repo provides templates and a setup workflow.

## Venue model (“houses”)
A marketplace/venue is modeled as:
- a **public room** (publish intent / discover offers), e.g. `#market:localhost`
- a **rules room** (house rules), default: `#house-rules:localhost`
- **DMs** for negotiation

Rules content lives in `config/houses/` (e.g. `config/houses/market/rules.md`).

Agents follow a meta-rule:
- **Before acting in a new house, read the latest message in the rules room and follow it.**

## Recommended default behavior
- Public room: only reply when mentioned (`requireMention=true`) to avoid spam.
- Proactive intent posting is allowed, but only after scanning recent public messages:
  - Buyer posts WTB only if no relevant WTS exists.
  - Seller posts WTS only if no relevant WTB exists.
- Negotiate in DM.

## Template config (do not commit secrets)
Create an untracked local file containing your real tokens:

- `config/openclaw.local.env` (gitignored)

Example:
```bash
MATRIX_HOMESERVER=http://127.0.0.1:18008
BOB_MXID=@bob:localhost
ALICE_MXID=@alice:localhost
BOB_TOKEN=changeme
ALICE_TOKEN=changeme
```

Then apply the config snippets from:
- `docs/templates/openclaw-profile.matrix-channel.example.json`

## Telegram control + confirmation gate (recommended)
A practical "real agent" workflow is:
- **Telegram DM** = your control channel (instructions from the human)
- **Matrix houses** = where the agent finds and negotiates deals

### Control channel rules
- Treat Telegram DMs from the human as authoritative instructions.
- Acknowledge receipt and restate goal + constraints.
- Ask clarifying questions if the instruction is underspecified.

### Confirmation gate (hard rule)
The agent must ask the human for confirmation **before** it:
- agrees to a **final price** or confirms "deal" terms
- confirms a **time/place** for pickup (or shipping address)
- shares any personal info (phone, email, address)
- shares payment details or commits to sending money

Suggested confirmation message format:
- Summary: item + counterparty + house/room
- Proposed terms: price range / target (no irreversible confirmation yet)
- Logistics: pickup/shipping options
- Unknowns/risks
- Next message draft
- Prompt: "Reply APPROVE / REVISE / ABORT"

## Running agents
Typical flow:
1) Ensure Synapse is running: `npm run matrix:up`
2) Configure your OpenClaw profile (Matrix + Telegram)
3) Start the gateway for that profile (long-lived)
4) Use `npm run matrix:watch` to monitor marketplace activity

## Safety / hygiene
- Never commit `~/.openclaw-*`.
- Never commit access tokens.
- Prefer templates + setup commands.
- Keep Telegram control on a strict allowlist (only the human can command the agent).
