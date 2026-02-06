#!/usr/bin/env bash
set -euo pipefail

# Minimal orchestrator for the stable #market:localhost room.
# Phase 3 MVP: spawn seller+buyer gateways, connect to matrix, inject missions, seed listing.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_ID="${RUN_ID:-$(date +%Y%m%d_%H%M%S)}"
export RUN_ID

# Ensure matrix bootstrap artifacts exist
[ -f "$ROOT_DIR/.local/bootstrap.env" ] || { echo "[run_scenario_basic] missing .local/bootstrap.env; run lab/bootstrap.sh" >&2; exit 1; }
[ -f "$ROOT_DIR/.local/secrets.env" ] || { echo "[run_scenario_basic] missing .local/secrets.env; run lab/bootstrap.sh" >&2; exit 1; }

mkdir -p "$ROOT_DIR/runs/$RUN_ID/out"

# Prepare profiles
openclaw --profile switch-seller config set gateway.mode local >/dev/null 2>&1 || true
openclaw --profile switch-buyer  config set gateway.mode local >/dev/null 2>&1 || true
openclaw --profile switch-seller plugins enable matrix >/dev/null 2>&1 || true
openclaw --profile switch-buyer  plugins enable matrix >/dev/null 2>&1 || true

# Connect Matrix
./lab/connect_matrix.sh switch-seller
./lab/connect_matrix.sh switch-buyer

# Spawn gateways (explicit ports to avoid collisions with the main gateway on 18789)
PORT=18791 TOKEN=token-switch-seller ./lab/spawn_gateway.sh switch-seller
PORT=18793 TOKEN=token-switch-buyer  ./lab/spawn_gateway.sh switch-buyer

# Create per-run DM room (deterministic export)
./lab/create_dm_room.sh "$RUN_ID"

# Inject missions
DM_ROOM_ID=$(node -e 'const fs=require("node:fs"); const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(m.dmRoomId||"")' "$ROOT_DIR/runs/$RUN_ID/out/meta.json" 2>/dev/null || true)

./lab/mission.sh switch-seller "MISSION: You are SWITCH_SELLER. You are selling a Nintendo Switch. Anchor price: 200€. Absolute floor: 150€. You may negotiate down, but never below 150€. Post ONE listing in the market room now. When contacted in DM, negotiate for up to 8 turns. Be concise. Run id: ${RUN_ID}. DM room id: ${DM_ROOM_ID}"
./lab/mission.sh switch-buyer "MISSION: You are SWITCH_BUYER. You want to buy a Nintendo Switch. Max budget: 150€. Start offer: 120€. You can go up to 150€. Watch the market room; when you see a Switch listing, DM the seller within 1 minute. Negotiate for up to 8 turns. Ask condition + accessories + pickup/shipping. Be concise. Run id: ${RUN_ID}. DM room id: ${DM_ROOM_ID}"

# Deterministic nudge (mention-gating is ON): send a direct system event to buyer
./lab/mission.sh switch-buyer "NUDGE: Go to #market:localhost now, find the latest Switch listing with RUN_ID:${RUN_ID}, and DM the seller immediately." || true

# Seed listing
./lab/seed_market.sh

DURATION_SEC="${DURATION_SEC:-120}"
echo "[run_scenario_basic] started run_id=$RUN_ID (duration=${DURATION_SEC}s)"
echo "[run_scenario_basic] watch: Element → #market:localhost"

echo "[run_scenario_basic] sleeping ${DURATION_SEC}s then stopping gateways (circuit breaker)"
sleep "$DURATION_SEC" || true

./lab/stop_gateway.sh switch-seller "$RUN_ID" || true
./lab/stop_gateway.sh switch-buyer "$RUN_ID" || true

echo "[run_scenario_basic] stopped gateways; exporting + scoring"
./lab/export_run.sh "$RUN_ID" || true
./lab/score.sh "$RUN_ID" || true

# Convenience pointer
ln -sfn "$ROOT_DIR/runs/$RUN_ID" "$ROOT_DIR/runs/latest" || true

echo "[run_scenario_basic] done. summary: $ROOT_DIR/runs/$RUN_ID/out/summary.json"
