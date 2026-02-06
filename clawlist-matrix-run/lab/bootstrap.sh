#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

HS="${HOMESERVER:-http://127.0.0.1:18008}"
MATRIX_PORT="${MATRIX_PORT:-18008}"
SYNAPSE_CONTAINER="${SYNAPSE_CONTAINER:-infra_synapse_1}"

SECRETS_ENV="${SECRETS_ENV:-$ROOT_DIR/.local/secrets.env}"
OUT_ENV="${OUT_ENV:-$ROOT_DIR/.local/bootstrap.env}"

mkdir -p "$(dirname "$SECRETS_ENV")"
umask 077

echo "[lab/bootstrap] ensuring synapse reachable at $HS"
curl -fsS "$HS/_matrix/client/versions" >/dev/null

# Create users + login (cached) + ensure stable room alias #market:localhost
# This prints env vars including ROOM_ID / ROOM_ALIAS / SELLER_TOKEN / BUYER_TOKEN.
# It also caches tokens into $SECRETS_ENV.
export BOOTSTRAP_MODE=agents
export MATRIX_REUSE=1
export MATRIX_PORT
export SYNAPSE_CONTAINER
export SECRETS_ENV
# No MATRIX_RUN_ID => room alias defaults to #market:localhost
unset MATRIX_RUN_ID || true

echo "[lab/bootstrap] running scripts/bootstrap_matrix.sh"
raw="$ROOT_DIR/.local/bootstrap.raw"
./scripts/bootstrap_matrix.sh 2>&1 | tee "$raw" >/dev/null

grep -E '^[A-Z0-9_]+=.*$' "$raw" > "$OUT_ENV" || true
[ -s "$OUT_ENV" ] || { echo "[lab/bootstrap] ERROR: no env output (see $raw)" >&2; exit 1; }

# shellcheck disable=SC1090
source "$OUT_ENV"

# Best-effort: grant admin power in market room (so you can moderate in Element)
if [ -n "${ROOM_ID:-}" ] && [ -n "${SELLER_TOKEN:-}" ]; then
  pl_json=$(curl -fsS -H "Authorization: Bearer $SELLER_TOKEN" "$HS/_matrix/client/v3/rooms/$ROOM_ID/state/m.room.power_levels" || echo '')
  if [ -n "$pl_json" ]; then
    newpl=$(node -e 'const pl=JSON.parse(process.argv[1]); pl.users=pl.users||{}; pl.users["@admin:localhost"]=Math.max(pl.users["@admin:localhost"]||0,100); process.stdout.write(JSON.stringify(pl));' "$pl_json" || true)
    if [ -n "$newpl" ]; then
      curl -fsS -X PUT "$HS/_matrix/client/v3/rooms/$ROOM_ID/state/m.room.power_levels" \
        -H "Authorization: Bearer $SELLER_TOKEN" -H 'Content-Type: application/json' \
        -d "$newpl" >/dev/null || true
    fi
  fi
fi

# Best-effort: publish room to directory (requires room_list_publication_rules allow)
if [ -n "${ROOM_ID:-}" ] && [ -n "${SELLER_TOKEN:-}" ]; then
  curl -sS -o /dev/null -X PUT "$HS/_matrix/client/v3/directory/list/room/${ROOM_ID}" \
    -H "Authorization: Bearer $SELLER_TOKEN" -H 'Content-Type: application/json' \
    -d '{"visibility":"public"}' || true
fi

echo "[lab/bootstrap] wrote:"
echo "- tokens cache: $SECRETS_ENV"
echo "- bootstrap env: $OUT_ENV"
echo "[lab/bootstrap] market room: ${ROOM_ALIAS:-} (${ROOM_ID:-})"
