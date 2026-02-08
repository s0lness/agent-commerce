#!/usr/bin/env bash
set -euo pipefail

# Helper: send a message into #market:localhost as switch_seller (for nudges/tests)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/.local/bootstrap.env"
source "$ROOT_DIR/.local/secrets.env"

HS="${HOMESERVER:-http://127.0.0.1:18008}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d_%H%M%S)}"
BODY="${BODY:-${1:-}}"
[ -n "$BODY" ] || { echo "usage: operator_send_to_market.sh <text>" >&2; exit 2; }

curl -fsS -X PUT "$HS/_matrix/client/v3/rooms/${ROOM_ID}/send/m.room.message/txn${RUN_ID}" \
  -H "Authorization: Bearer ${SELLER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"msgtype":"m.text","body":"'"$BODY"'"}' \
  >/dev/null

echo "[send_to_market] sent"
