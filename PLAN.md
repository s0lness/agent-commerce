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
- All secrets are provided via **env vars** or a **local-only secrets file** (chmod 600) and are **gitignored**.
- Every episodic run produces a self-contained artifact bundle under `runs/<runId>/out/`.
- Prefer **determinism** over heuristics (explicit room IDs, explicit run IDs).

## Standard paths (to reduce ambiguity)
- Matrix bootstrap secrets (gitignored): `clawlist-matrix-run/.local/secrets.env`
- Per-run artifacts: `clawlist-matrix-run/runs/<runId>/out/`
- Per-run summary: `clawlist-matrix-run/runs/<runId>/out/summary.json`

## Artifact safety / redaction rules
- Never write credentials to tracked files, docs, or logs.
- `meta.json` must **not** contain raw access tokens (mask if present).
- `summary.json` must never include secrets.
- Treat transcripts (`*.jsonl`) as sensitive (they may include IDs/content you don’t want public).

---

## Checklist

### Phase 0 — Repo hygiene + secrets safety
- [ ] Add/update `.gitignore` to ensure these are never committed:
  - `**/secrets.env`
  - `**/*.token`
  - `**/.env`
  - `clawlist-matrix-run/.local/`
  - `clawlist-matrix-run/runs/`
  - any Matrix synapse data dirs (`synapse-data*/`)
- [ ] Add a short `SECURITY.md` (no secrets, just rules): tokens never committed; use local env files.
- [ ] Ensure all scripts that write secrets do `umask 077` and `chmod 600`.

### Phase 1 — Persistent infra: Synapse + Element Web (local-only)
Goal: start infra rarely; keep it running.

- [ ] Create `infra/docker-compose.yml` (or rename existing) that runs:
  - Synapse (persisted volume = existing `synapse-data2/`)
  - Element Web (new)
- [ ] Bind ports to **127.0.0.1** only (explicitly, e.g. `127.0.0.1:18008:8008`, not `0.0.0.0`).
- [ ] Add `infra/element-config.json` pointing Element to `http://127.0.0.1:18008`.
- [ ] Add `lab/up.sh`:
  - starts compose
  - waits for `/_matrix/client/versions`
  - prints UI URL (expected: Element at `http://127.0.0.1:18080`, Synapse at `http://127.0.0.1:18008`)
- [ ] Add `lab/down.sh` (optional; should not delete volumes).

Definition of Done:
- `./lab/up.sh` exits 0.
- `curl -fsS http://127.0.0.1:18008/_matrix/client/versions` succeeds.
- Element loads at `http://127.0.0.1:18080` and shows the login screen, configured against `http://127.0.0.1:18008`.

### Phase 2 — Persistent bootstrap (baseline users + stable rooms)
Goal: stop creating per-run market rooms by default.

- [ ] Add `lab/bootstrap.sh` (idempotent):
  - ensures synapse is up
  - ensures baseline users exist (e.g. `switch_seller`, `switch_buyer`, plus future)
  - ensures stable room alias exists: `#market:localhost`
  - ensures buyer is joined
  - writes tokens to `clawlist-matrix-run/.local/secrets.env` (gitignored, chmod 600)

Notes:
- For now, keep easy registration because we’re **local-only**.

Definition of Done:
- Element shows `#market:localhost` and both baseline users can post.
- `clawlist-matrix-run/.local/secrets.env` exists with mode 600.

### Phase 3 — Spawnable agents attached to the lab
Goal: treat agents as ephemeral processes.

- [ ] Add `lab/spawn_gateway.sh --profile <name> --runId <runId>`:
  - picks a free port
  - starts `openclaw --profile <name> gateway run ...` in background
  - writes logs under `clawlist-matrix-run/runs/<runId>/out/`
- [ ] Add `lab/connect_matrix.sh --profile <name> --mxid <mxid> --token <token> --room <roomIdOrAlias>`:
  - sets `channels.matrix` for that profile (based on existing `run.sh` code)
- [ ] Add `lab/mission.sh --profile <name> --runId <runId> --text "..."` (wrap `openclaw system event`)
- [ ] Add `lab/seed_market.sh --runId <runId>` to post deterministic starter listings/noise.

Definition of Done:
- Within 30s of running the scripts, both seller and buyer profiles visibly post into `#market:localhost` (seen in Element).

### Phase 4 — Telegram-controlled agent (fresh bot)
Goal: one agent can be steered by you via Telegram while it participates in Matrix.

- [ ] Create a new Telegram bot via BotFather (token kept private).
- [ ] Decide the Telegram-controlled profile name (recommended: `operator-bot`).
- [ ] Configure Telegram channel for that profile in a **local-only config step**:
  - token stored locally (not in repo)
  - DM allowlist restricted to Sylve
- [ ] Ensure the same profile also has Matrix enabled and is allowed in `#market:localhost`.

Definition of Done:
- You DM the Telegram bot and see the agent respond and/or change behavior in Matrix.

### Phase 5 — Transcript export (robust in persistent world)
Goal: exports keep working even with many rooms/history.

Decision:
- We will create a **dedicated per-run DM room** explicitly and store its `room_id` in `meta.json`.

- [ ] Add `lab/create_dm_room.sh --runId <id>`:
  - creates a private room
  - invites buyer/seller
  - records the DM `room_id` in `runs/<runId>/out/meta.json`
- [ ] Define `meta.json` minimum schema (so export/score stay aligned):
  - `runId`
  - `homeserver`
  - `marketRoomId`
  - `dmRoomId`
  - `seller.mxid`, `buyer.mxid`
  - `startedAt` (ISO), `endedAt` (ISO) (optional but recommended)
- [ ] Update scenario orchestration to use this DM room (no heuristics).
- [ ] Add `lab/export.sh --runId <id> --since <duration>`:
  - exports market room timeline slice
  - exports the run DM room
  - writes `runs/<runId>/out/market.jsonl`, `dm.jsonl`, `meta.json`

Definition of Done:
- Export always includes the correct DM room for the run (verified by presence of run seed/missions in the exported DM timeline).

### Phase 6 — Evaluation scoring
Goal: measurable outcomes and regressions.

- [ ] Add `eval/score_run.mjs` that reads the exported JSONLs + meta and writes `summary.json`:
  - deal reached (yes/no)
  - final price (if any)
  - constraint violations (seller floor, buyer ceiling, max turns, response timing)
  - quality signals (asked condition/accessories/logistics; answered)
  - safety/policy flags (PII requests, weird payment methods, hallucinated logistics)
- [ ] Add `lab/score.sh --runId <id>` wrapper.

Definition of Done:
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
- [ ] Add a single entrypoint (pick one):
  - Option A: `Makefile` targets
  - Option B: `lab/lab.sh up|bootstrap|scenario|sweep|export|score`
- [ ] If using Makefile, include:
  - `make up`, `make bootstrap`, `make scenario SCENARIO=switch_basic`, `make sweep`
- [ ] Add `runs/latest` symlink for convenience.
- [ ] Optional: lightweight CI (only if desired) to run one short scenario.

Definition of Done:
- A new run can be executed with one command and produces `runs/<runId>/out/summary.json`.

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

