#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

OPENCLAW="${OPENCLAW:-/home/sylve/.nvm/versions/node/v22.22.0/bin/openclaw}"
NPM="${NPM:-/home/sylve/.nvm/versions/node/v22.22.0/bin/npm}"

RUN_MINUTES="${RUN_MINUTES:-5}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d_%H%M%S)}"

OUT_DIR="$ROOT_DIR/runs/$RUN_ID/out"
mkdir -p "$OUT_DIR"

SELLER_PROFILE="${SELLER_PROFILE:-switch-seller}"
BUYER_PROFILE="${BUYER_PROFILE:-switch-buyer}"

# Avoid 18789 (commonly used by your main OpenClaw gateway / webchat)
SELLER_GATEWAY_PORT="${SELLER_GATEWAY_PORT:-18791}"
BUYER_GATEWAY_PORT="${BUYER_GATEWAY_PORT:-18792}"
# Reserve ports that may be used by your main OpenClaw gateway/webchat.
# 18789 is the common gateway port; 18792 may be in use as well in your setup.
RESERVED_PORTS="${RESERVED_PORTS:-18789,18792}"

TIMEOUT_GATEWAY_READY_SEC="${TIMEOUT_GATEWAY_READY_SEC:-30}"
TIMEOUT_MATRIX_READY_SEC="${TIMEOUT_MATRIX_READY_SEC:-60}"

# --- helpers

die() {
  echo "[run] ERROR: $*" >&2
  exit 1
}

port_in_use() {
  local port="$1"
  # Be conservative + portable: parse `ss` output directly.
  # (Some `ss` builds treat filter expressions oddly and may exit 0 even when nothing matches.)
  ss -ltnH 2>/dev/null | grep -Eq "[:\]]${port}\\b" && return 0
  return 1
}

port_is_reserved() {
  local port="$1"
  IFS=',' read -ra arr <<<"${RESERVED_PORTS}"
  for p in "${arr[@]}"; do
    if [ "${p}" = "${port}" ]; then
      return 0
    fi
  done
  return 1
}

pick_free_port() {
  local port="$1"
  while port_in_use "$port" || port_is_reserved "$port"; do
    port=$((port + 1))
  done
  echo "$port"
}

wait_for_port() {
  local port="$1" timeout="$2"
  local t=0
  while [ "$t" -lt "$timeout" ]; do
    if port_in_use "$port"; then
      return 0
    fi
    sleep 1
    t=$((t + 1))
  done
  return 1
}

mask_token() {
  local tok="$1"
  if [ "${#tok}" -le 8 ]; then
    echo "REDACTED"
  else
    echo "${tok:0:4}…${tok: -4}"
  fi
}

# --- choose ports

SELLER_GATEWAY_PORT="$(pick_free_port "$SELLER_GATEWAY_PORT")"
if [ "$BUYER_GATEWAY_PORT" -eq "$SELLER_GATEWAY_PORT" ]; then
  BUYER_GATEWAY_PORT=$((SELLER_GATEWAY_PORT + 1))
fi
BUYER_GATEWAY_PORT="$(pick_free_port "$BUYER_GATEWAY_PORT")"

echo "[run] run_id=$RUN_ID"
echo "[run] using gateway ports: seller=${SELLER_GATEWAY_PORT} buyer=${BUYER_GATEWAY_PORT}"

SELLER_GATEWAY_TOKEN="${SELLER_GATEWAY_TOKEN:-token-switch-seller}"
BUYER_GATEWAY_TOKEN="${BUYER_GATEWAY_TOKEN:-token-switch-buyer}"

# --- Matrix bootstrap (tokens + per-run market room)

export MATRIX_RUN_ID="$RUN_ID"
export MATRIX_REUSE="${MATRIX_REUSE:-1}"

MATRIX_BOOTSTRAP_OUT="$OUT_DIR/bootstrap.env"
TMP_BOOT="$OUT_DIR/bootstrap.raw"

echo "[run] bootstrapping matrix (reuse=${MATRIX_REUSE})"
# Capture stderr too, otherwise failures disappear.
./scripts/bootstrap_matrix.sh 2>&1 | tee "$TMP_BOOT" >/dev/null

grep -E '^[A-Z0-9_]+=.*$' "$TMP_BOOT" > "$MATRIX_BOOTSTRAP_OUT" || true
[ -s "$MATRIX_BOOTSTRAP_OUT" ] || die "matrix bootstrap produced no env output; see $TMP_BOOT"

# shellcheck disable=SC1090
source "$MATRIX_BOOTSTRAP_OUT"

MATRIX_PORT="${MATRIX_PORT:-18008}"
HOMESERVER="${HOMESERVER:-http://127.0.0.1:${MATRIX_PORT}}"
MARKET_ROOM_ID="$ROOM_ID"

# Fast-fail token sanity check (no retries on 401/403)
validate_token() {
  local label="$1" token="$2"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${token}" \
    "${HOMESERVER}/_matrix/client/v3/account/whoami" || true)
  if [ "$code" != "200" ]; then
    die "${label} token invalid (whoami http ${code}). See $TMP_BOOT"
  fi
}

echo "[run] validating matrix tokens"
validate_token seller "$SELLER_TOKEN"
validate_token buyer "$BUYER_TOKEN"

# --- Ensure profiles are runnable (gateway.mode, plugin install+deps, plugin enabled)

profile_state_dir() {
  local profile="$1"
  echo "$HOME/.openclaw-${profile}"
}

oc() {
  local profile="$1"; shift
  OPENCLAW_STATE_DIR="$(profile_state_dir "$profile")" \
    OPENCLAW_GATEWAY_PORT="" \
    OPENCLAW_GATEWAY_TOKEN="" \
    "$OPENCLAW" --profile "$profile" "$@"
}

ensure_profile_ready() {
  local profile="$1"

  oc "$profile" config set gateway.mode local >/dev/null 2>&1 || true
  oc "$profile" plugins install @openclaw/matrix >/dev/null 2>&1 || true
  oc "$profile" plugins enable matrix >/dev/null 2>&1 || true

  local ext_dir="$HOME/.openclaw-${profile}/extensions/matrix"
  if [ -d "$ext_dir" ]; then
    if [ ! -d "$ext_dir/node_modules/@vector-im/matrix-bot-sdk" ]; then
      echo "[run] installing matrix plugin deps for profile=${profile}"
      EXT_DIR="$ext_dir" node --input-type=module - <<'NODE'
import fs from 'node:fs';
import path from 'node:path';

const extDir = process.env.EXT_DIR;
if (!extDir) throw new Error('EXT_DIR not set');

const pkgPath = path.join(extDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

delete pkg.devDependencies;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
NODE
      (cd "$ext_dir" && "$NPM" install --omit=dev >/dev/null)
    fi
  fi
}

echo "[run] preparing profiles"
ensure_profile_ready "$SELLER_PROFILE"
ensure_profile_ready "$BUYER_PROFILE"

# --- Configure Matrix channel for each profile

configure_matrix() {
  local profile="$1" token="$2" mxid="$3"
  oc "$profile" config set --json 'channels.matrix' "{ enabled: true, homeserver: '${HOMESERVER}', accessToken: '${token}', userId: '${mxid}', encryption: false, dm: { policy: 'open', allowFrom: ['*'] }, groupPolicy: 'open', groups: { '*': { requireMention: false }, '${MARKET_ROOM_ID}': { allow: true, requireMention: false } } }" >/dev/null
}

echo "[run] configuring matrix channel"
configure_matrix "$SELLER_PROFILE" "$SELLER_TOKEN" "$SELLER_MXID"
configure_matrix "$BUYER_PROFILE" "$BUYER_TOKEN" "$BUYER_MXID"

# --- Note on gateway safety
# We do NOT stop/start any managed gateway service here.
# This harness should never touch your main gateway (often on :18789).
# We simply bind two new gateway processes on free ports.

# --- Start gateways (explicit ports)

SELLER_LOG="$OUT_DIR/gateway_${SELLER_PROFILE}.log"
BUYER_LOG="$OUT_DIR/gateway_${BUYER_PROFILE}.log"

cleanup() {
  echo "[run] stopping gateways"
  kill "${SELLER_PID:-}" "${BUYER_PID:-}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Avoid any inherited env forcing the gateway to pick a different port.
unset OPENCLAW_GATEWAY_PORT || true

echo "[run] starting openclaw gateways"
oc "$SELLER_PROFILE" gateway run --port "$SELLER_GATEWAY_PORT" --token "$SELLER_GATEWAY_TOKEN" --force --compact --allow-unconfigured >"$SELLER_LOG" 2>&1 &
SELLER_PID=$!

oc "$BUYER_PROFILE" gateway run --port "$BUYER_GATEWAY_PORT" --token "$BUYER_GATEWAY_TOKEN" --force --compact --allow-unconfigured >"$BUYER_LOG" 2>&1 &
BUYER_PID=$!

# Wait for gateways to bind their ports
if ! wait_for_port "$SELLER_GATEWAY_PORT" "$TIMEOUT_GATEWAY_READY_SEC"; then
  die "seller gateway not ready on port ${SELLER_GATEWAY_PORT} within ${TIMEOUT_GATEWAY_READY_SEC}s (see $SELLER_LOG)"
fi
if ! wait_for_port "$BUYER_GATEWAY_PORT" "$TIMEOUT_GATEWAY_READY_SEC"; then
  die "buyer gateway not ready on port ${BUYER_GATEWAY_PORT} within ${TIMEOUT_GATEWAY_READY_SEC}s (see $BUYER_LOG)"
fi

# --- Inject missions

echo "[run] injecting missions"
oc "$SELLER_PROFILE" system event \
  --url "ws://127.0.0.1:${SELLER_GATEWAY_PORT}" \
  --token "$SELLER_GATEWAY_TOKEN" \
  --mode now \
  --text "MISSION: You are SWITCH_SELLER. You are selling a Nintendo Switch. Anchor price: 200€. Absolute floor: 150€. You may negotiate down, but never below 150€. Post ONE listing in the market room now. When contacted in DM, negotiate for up to 8 turns. Be concise, no roleplay fluff. Run id: ${RUN_ID}." \
  >/dev/null

oc "$BUYER_PROFILE" system event \
  --url "ws://127.0.0.1:${BUYER_GATEWAY_PORT}" \
  --token "$BUYER_GATEWAY_TOKEN" \
  --mode now \
  --text "MISSION: You are SWITCH_BUYER. You want to buy a Nintendo Switch. Max budget: 150€. Start offer: 120€. You can go up to 150€. Watch the market room; when you see a Switch listing, DM the seller within 1 minute. Negotiate for up to 8 turns. Ask condition + accessories + pickup/shipping. Be concise. Run id: ${RUN_ID}." \
  >/dev/null

# --- Seed market message (deterministic kick)

echo "[run] seeding market listing"
curl -fsS -X PUT "${HOMESERVER}/_matrix/client/v3/rooms/${MARKET_ROOM_ID}/send/m.room.message/txn${RUN_ID}" \
  -H "Authorization: Bearer ${SELLER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"msgtype":"m.text","body":"RUN_ID:'"$RUN_ID"' SELLING: nintendo switch — asking 200€ (can negotiate). DM me."}' \
  >/dev/null

# --- Let them run

echo "[run] running for ${RUN_MINUTES} minutes"
sleep "$((RUN_MINUTES * 60))"

# --- Write artifacts (no secrets in meta)

SECRETS_ENV="$OUT_DIR/secrets.env"
META_JSON="$OUT_DIR/meta.json"

umask 077
{
  echo "SELLER_TOKEN=$SELLER_TOKEN"
  echo "BUYER_TOKEN=$BUYER_TOKEN"
  echo "SELLER_GATEWAY_TOKEN=$SELLER_GATEWAY_TOKEN"
  echo "BUYER_GATEWAY_TOKEN=$BUYER_GATEWAY_TOKEN"
} >"$SECRETS_ENV"
chmod 600 "$SECRETS_ENV" 2>/dev/null || true

cat >"$META_JSON" <<META
{
  "runId": "${RUN_ID}",
  "homeserver": "${HOMESERVER}",
  "marketRoomId": "${MARKET_ROOM_ID}",
  "seller": { "profile": "${SELLER_PROFILE}", "mxid": "${SELLER_MXID}" },
  "buyer": { "profile": "${BUYER_PROFILE}", "mxid": "${BUYER_MXID}" },
  "tokensMasked": {
    "seller": "$(mask_token "$SELLER_TOKEN")",
    "buyer": "$(mask_token "$BUYER_TOKEN")"
  },
  "runMinutes": ${RUN_MINUTES}
}
META

# --- Export transcripts

echo "[run] exporting transcripts"
node ./scripts/export_transcripts.mjs "$OUT_DIR" "$META_JSON" "$SECRETS_ENV"

# --- Assertions (MVP: they talk)

if [ "${ASSERT_TALK:-1}" = "1" ]; then
  echo "[run] asserting: they talk"
  node ./scripts/assert_they_talk.mjs "$OUT_DIR" "$META_JSON"
fi

echo "[run] done. outputs in $OUT_DIR"
