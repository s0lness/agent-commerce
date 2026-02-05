# Clawlist Matrix Run Harness (2-agent scenario)

This folder contains a reproducible **scenario run** harness:

- Starts a local **Matrix/Synapse** homeserver in Docker
- Creates two bot users:
  - `@switch_seller:localhost`
  - `@switch_buyer:localhost`
- Creates a public market room (`#market:localhost`), invites both bots
- Starts **two isolated OpenClaw profiles** (one per bot) with the Matrix plugin enabled
- Injects each agent's mission (seller/buyer)
- Seeds the market with an initial listing
- Runs for a fixed duration
- Exports transcripts (market room + DM room) to `out/`

## Run

```bash
cd clawlist-matrix-run
./run.sh
```

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
- If you rerun, it reuses the same synapse data dir unless you delete `synapse-data/`.
