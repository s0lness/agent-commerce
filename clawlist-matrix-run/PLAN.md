# @clawlist — Persistent Matrix Lab + Eval Harness (Plan)

This plan turns the current `clawlist-matrix-run/` “single run” harness into a **persistent Matrix playground** with:
- a **UI** (Element Web) to watch rooms/DMs live
- **spawnable OpenClaw agent profiles** that can be attached/detached quickly
- one **Telegram-controlled agent** (fresh bot) for human-in-the-loop steering
- **repeatable scenario runs** with transcript export + scoring

## Decisions (locked in)
- UI: **Element Web** (Matrix client) ✅
- Telegram: **create a fresh bot**; treat token as a secret; **never commit or document credentials** ✅
- Network: **LOCAL ONLY** initially (bind services to `127.0.0.1`) ✅

---

## Guiding principles
- Split **persistent infra** (Synapse + Element + baseline rooms/users) from **episodic runs** (spawn agents, inject missions, export/score).
- All secrets are provided via **env vars or local-only `secrets.env`** (chmod 600) and are **gitignored**.
- Every episodic run produces a self-contained artifact bundle under `runs/<runId>/out/`.

---

## Checklist

### Phase 0 — Repo hygiene + secrets safety
- [ ] Add/update `.gitignore` to ensure these are never committed:
  - `**/secrets.env`
  - `**/*.token`
  - `**/.env`
  - `runs/`
  - any Matrix synapse data dirs (`synapse-data*/`)
- [ ] Add a short `SECURITY.md` (no secrets, just rules): tokens never committed; use local env files.
- [ ] Ensure all scripts that write secrets do `umask 077` and `chmod 600`.

### Phase 1 — Persistent infra: Synapse + Element Web (local-only)
Goal: start infra rarely; keep it running.

- [ ] Create `infra/docker-compose.yml` (or rename existing) that runs:
  - Synapse (persisted volume = existing `synapse-data2/`)
  - Element Web (new)
- [ ] Bind ports to **127.0.0.1** only.
- [ ] Add `infra/element-config.json` pointing Element to `http://127.0.0.1:18008`.
- [ ] Add `lab/up.sh`:
  - starts compose
  - waits for `/_matrix/client/versions`
  - prints UI URL
- [ ] Add `lab/down.sh` (optional; should not delete volumes).

Acceptance:
- Element loads in browser and can connect to the local homeserver.

### Phase 2 — Persistent bootstrap (baseline users + stable rooms)
Goal: stop creating per-run market rooms by default.

- [ ] Add `lab/bootstrap.sh` (idempotent):
  - ensures synapse is up
  - ensures baseline users exist (e.g. `switch_seller`, `switch_buyer`, plus future)
  - ensures stable room alias exists: `#market:localhost`
  - ensures buyer is joined
  - outputs tokens to a local-only secrets file (gitignored)

Notes:
- For now, keep easy registration because we’re **local-only**.

Acceptance:
- `#market:localhost` exists and is visible in Element.

### Phase 3 — Spawnable agents attached to the lab
Goal: treat agents as ephemeral processes.

- [ ] Add `lab/spawn_gateway.sh --profile <name>`:
  - picks a free port
  - starts `openclaw --profile <name> gateway run ...` in background
  - writes logs under `runs/<runId>/out/`
- [ ] Add `lab/connect_matrix.sh --profile <name> --mxid <mxid> --token <token> --room <roomIdOrAlias>`:
  - sets `channels.matrix` for that profile (based on existing `run.sh` code)
- [ ] Add `lab/mission.sh --profile <name> --text "..."` (wrap `openclaw system event`)
- [ ] Add `lab/seed_market.sh` to post deterministic starter listings/noise.

Acceptance:
- You can spawn seller/buyer profiles and see them post in `#market:localhost`.

### Phase 4 — Telegram-controlled agent (fresh bot)
Goal: one agent can be steered by you via Telegram while it participates in Matrix.

- [ ] Create a new Telegram bot via BotFather (token kept private).
- [ ] Decide the Telegram-controlled profile name (recommended: `operator-bot`).
- [ ] Configure Telegram channel for that profile in a **local-only config step**:
  - token stored locally (not in repo)
  - DM allowlist restricted to Sylve
- [ ] Ensure the same profile also has Matrix enabled and is allowed in `#market:localhost`.

Acceptance:
- You DM the Telegram bot and see the agent respond and/or change behavior in Matrix.

### Phase 5 — Transcript export (robust in persistent world)
Goal: exports keep working even with many rooms/history.

- [ ] Replace DM detection heuristic with a robust method:
  - Option A (recommended): create a dedicated per-run DM room explicitly and store its room_id in meta
  - Option B: stamp `RUN_ID=...` in first DM and locate that room for export
- [ ] Add `lab/export.sh --runId <id> --since <duration>`:
  - exports market room timeline slice
  - exports run-specific DM room
  - writes `runs/<runId>/out/market.jsonl`, `dm.jsonl`, `meta.json`

Acceptance:
- Export always includes the right DM conversation.

### Phase 6 — Evaluation scoring
Goal: measurable outcomes and regressions.

- [ ] Add `eval/score_run.mjs` that reads the exported JSONLs + meta and writes `summary.json`:
  - deal reached (yes/no)
  - final price (if any)
  - constraint violations (seller floor, buyer ceiling, max turns, response timing)
  - quality signals (asked condition/accessories/logistics; answered)
  - safety/policy flags (PII requests, weird payment methods, hallucinated logistics)
- [ ] Add `lab/score.sh --runId <id>` wrapper.

Acceptance:
- `summary.json` exists and can fail a run for hard violations.

### Phase 7 — Scenarios + sweeps
Goal: repeatable benchmarks.

- [ ] Add `scenarios/*.json` (starting with `switch_basic.json`).
- [ ] Add `lab/run_scenario.sh --scenario <name> --runId <id>` orchestrator:
  - spawns agents
  - injects missions from scenario
  - seeds market
  - waits or schedules interventions
  - exports + scores
- [ ] Add `lab/sweep.sh` to run a batch and aggregate results.

Acceptance:
- You can run 10 scenarios and get an aggregate success rate.

### Phase 8 — Dev ergonomics
- [ ] Add `Makefile` targets:
  - `make up`, `make bootstrap`, `make scenario SCENARIO=switch_basic`, `make sweep`
- [ ] Add `runs/latest` symlink for convenience.
- [ ] Optional: lightweight CI (only if desired) to run one short scenario.

---

## Operating mode (day-to-day)
1) `make up` (rare)
2) `make bootstrap` (rare)
3) Open Element UI and keep it open
4) For experiments:
   - `make scenario SCENARIO=...`
   - watch in Element
   - optionally steer the operator via Telegram
   - inspect `runs/<runId>/out/summary.json`

---

## Non-goals (for now)
- LAN exposure / TLS / hardening (we can revisit once local lab is stable)
- Public deployments

