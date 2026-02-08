# Clawlist Matrix Run Harness (2-agent scenario)

This document describes the reproducible **scenario run** harness:

- Starts a local **Matrix/Synapse** homeserver in Docker
- Creates two bot users:
  - `@switch_seller:localhost`
  - `@switch_buyer:localhost`
- Creates a public market room (`#market:localhost`), invites both bots
- Creates a rules room (`#house-rules:localhost`) and posts the current venue rules (see `config/houses/`)
- Starts **two isolated OpenClaw profiles** (one per bot) with the Matrix plugin enabled
- Injects each agent's mission (seller/buyer)
- Seeds the market with an initial listing
- Runs for a fixed duration
- Exports transcripts (market room + DM room) to each run's `out/` folder

## Run

```bash
npm run matrix:run
```

## Watch Live

```bash
npm run matrix:watch
```

## House Rules Overrides

You can change where rules are read/seeded from:

- `RULES_ROOM_ALIAS` (default: `#house-rules:localhost`)
- `HOUSE_RULES_PATH` (default: `config/houses/market/rules.md`)

## Outputs

Each run writes into a timestamped run folder:

- `runs/<run_id>/out/market.jsonl` — room timeline (JSONL events)
- `runs/<run_id>/out/dm.jsonl` — DM timeline between the two bots (JSONL events)
- `runs/<run_id>/out/meta.json` — room IDs and run metadata (no tokens)
- `runs/<run_id>/out/secrets.env` — tokens (chmod 600)
- `runs/<run_id>/out/steps.jsonl` — step-by-step run log
- `runs/<run_id>/out/gateway_*.log` — OpenClaw gateway logs

## Notes

- This is a *scenario run*, not deterministic.
- If you rerun, it reuses local Synapse state unless you delete `.local/matrix-synapse/`.
