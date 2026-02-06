#!/usr/bin/env bash
set -euo pipefail

# Create a dedicated per-run DM room where the operator (@operator:localhost) is the seller.
# Invites buyer + admin observer.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/.local/bootstrap.env"
source "$ROOT_DIR/.local/secrets.env"

HS="${HOMESERVER:-http://127.0.0.1:18008}"
RUN_ID="${RUN_ID:-${1:-}}"
[ -n "$RUN_ID" ] || { echo "usage: create_dm_room_operator_seller.sh <runId>" >&2; exit 2; }

OUT_DIR="$ROOT_DIR/runs/$RUN_ID/out"
mkdir -p "$OUT_DIR"
META_JSON="$OUT_DIR/meta.json"

ADMIN_MXID="${ADMIN_MXID:-@admin:localhost}"

create=$(curl -fsS -X POST "$HS/_matrix/client/v3/createRoom" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "preset":"private_chat",
    "name":"dm-'"$RUN_ID"'",
    "topic":"clawlist dm run '"$RUN_ID"' (operator seller)",
    "invite":["'"$BUYER_MXID"'","'"$ADMIN_MXID"'"],
    "is_direct": true
  }')

DM_ROOM_ID=$(node -e 'const x=JSON.parse(process.argv[1]); process.stdout.write(x.room_id||"")' "$create")
[ -n "$DM_ROOM_ID" ] || { echo "[create_dm_room_operator_seller] ERROR: failed to create room: $create" >&2; exit 1; }

# Buyer joins best-effort
curl -fsS -X POST "$HS/_matrix/client/v3/rooms/${DM_ROOM_ID}/join" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}' >/dev/null || true

# Write/merge meta.json
startedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
META_JSON="$META_JSON" RUN_ID="$RUN_ID" HS="$HS" ROOM_ID="$ROOM_ID" DM_ROOM_ID="$DM_ROOM_ID" \
  OPERATOR_MXID="$OPERATOR_MXID" BUYER_MXID="$BUYER_MXID" STARTED_AT="$startedAt" \
node - <<'NODE'
const fs = require('fs');

const metaPath = process.env.META_JSON;
let meta = {};
if (fs.existsSync(metaPath)) {
  try { meta = JSON.parse(fs.readFileSync(metaPath,'utf8')); } catch {}
}
meta.runId = process.env.RUN_ID;
meta.homeserver = process.env.HS;
meta.marketRoomId = process.env.ROOM_ID;
meta.dmRoomId = process.env.DM_ROOM_ID;
meta.startedAt = meta.startedAt || process.env.STARTED_AT;
meta.seller = meta.seller || {}; meta.seller.mxid = process.env.OPERATOR_MXID;
meta.buyer = meta.buyer || {}; meta.buyer.mxid = process.env.BUYER_MXID;
meta.human = meta.human || {}; meta.human.role = 'seller'; meta.human.channel = 'telegram';
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
NODE

echo "[create_dm_room_operator_seller] dmRoomId=$DM_ROOM_ID"