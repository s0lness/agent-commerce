#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RUN_ID="${RUN_ID:-$(date +%Y%m%d_%H%M%S)}"
RUN_DIR="$ROOT_DIR/runs/$RUN_ID"
OUT_DIR="$RUN_DIR/out"
mkdir -p "$OUT_DIR"

OPENCLAW="${OPENCLAW:-$(command -v openclaw || true)}"
NPM="${NPM:-$(command -v npm || true)}"
TIMEOUT_BIN="$(command -v timeout || true)"
STEPS_LOG="$OUT_DIR/steps.jsonl"

if [ -z "$OPENCLAW" ] || [ ! -x "$OPENCLAW" ]; then
  echo "openclaw not found in PATH. Set OPENCLAW=/path/to/openclaw" >&2
  exit 1
fi

if [ -z "$NPM" ] || [ ! -x "$NPM" ]; then
  echo "npm not found in PATH. Set NPM=/path/to/npm" >&2
  exit 1
fi

log_step() {
  local step="$1"
  local status="$2"
  local msg="${3:-}"
  printf '{"ts":"%s","step":"%s","status":"%s","msg":"%s"}\n' \
    "$(date -Is)" "$step" "$status" "$msg" >>"$STEPS_LOG"
}

run_timeout() {
  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" 60s "$@"
  else
    "$@"
  fi
}

curl_retry() {
  local url="$1"
  local method="${2:-GET}"
  local data="${3:-}"
  local token="${4:-}"
  for i in {1..5}; do
    if [ -n "$token" ] && [ -n "$data" ]; then
      if curl -fsS --max-time 20 -X "$method" "$url" \
        -H "Authorization: Bearer $token" \
        -H 'Content-Type: application/json' \
        -d "$data" >/dev/null; then
        return 0
      fi
    elif [ -n "$data" ]; then
      if curl -fsS --max-time 20 -X "$method" "$url" \
        -H 'Content-Type: application/json' \
        -d "$data" >/dev/null; then
        return 0
      fi
    else
      if curl -fsS --max-time 20 "$url" >/dev/null; then
        return 0
      fi
    fi
    sleep 1
  done
  return 1
}

wait_port() {
  local host="$1"
  local port="$2"
  local tries=30
  for i in $(seq 1 "$tries"); do
    if (echo >"/dev/tcp/${host}/${port}") >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Where Synapse persists its state for this run.
# You can reuse a run by reusing RUN_ID.
export SYNAPSE_DIR="${SYNAPSE_DIR:-$RUN_DIR/synapse-data}"

RUN_MINUTES="${RUN_MINUTES:-5}"

SELLER_PROFILE="switch-seller"
BUYER_PROFILE="switch-buyer"

SELLER_GATEWAY_PORT="${SELLER_GATEWAY_PORT:-18791}"
BUYER_GATEWAY_PORT="${BUYER_GATEWAY_PORT:-18792}"

SELLER_GATEWAY_TOKEN="${SELLER_GATEWAY_TOKEN:-token-switch-seller}"
BUYER_GATEWAY_TOKEN="${BUYER_GATEWAY_TOKEN:-token-switch-buyer}"

MATRIX_BOOTSTRAP_OUT="$OUT_DIR/bootstrap.env"
MATRIX_BOOTSTRAP_RAW="$OUT_DIR/bootstrap.raw"
SECRETS_FILE="$OUT_DIR/secrets.env"

# 1) Matrix up + room + tokens

echo "[run] bootstrapping matrix"
log_step "bootstrap_matrix" "start"
BOOTSTRAP_SECRETS_FILE="$SECRETS_FILE" ./scripts/bootstrap_matrix.sh | tee "$MATRIX_BOOTSTRAP_RAW" >/dev/null
chmod 600 "$MATRIX_BOOTSTRAP_RAW" "$SECRETS_FILE" || true
# Keep only KEY=VALUE lines for sourcing
grep -E '^[A-Z0-9_]+=.*$' "$MATRIX_BOOTSTRAP_RAW" > "$MATRIX_BOOTSTRAP_OUT"
log_step "bootstrap_matrix" "ok"

# shellcheck disable=SC1090
source "$MATRIX_BOOTSTRAP_OUT"
if [ -f "$SECRETS_FILE" ]; then
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
fi

MATRIX_PORT="${MATRIX_PORT:-18008}"
HOMESERVER="http://127.0.0.1:${MATRIX_PORT}"
MARKET_ROOM_ID="$ROOM_ID"

# 2) Ensure profiles are runnable (gateway.mode, plugin install+deps, plugin enabled)

ensure_profile_ready() {
  local profile="$1"

  # Gateways require explicit local mode (or --allow-unconfigured).
  run_timeout $OPENCLAW --profile "$profile" config set gateway.mode local >/dev/null 2>&1 || true

  # Install Matrix plugin (copies into profile). Idempotent.
  run_timeout $OPENCLAW --profile "$profile" plugins install @openclaw/matrix >/dev/null 2>&1 || true

  # Ensure plugin is enabled in config (separate from channels.matrix.enabled).
  run_timeout $OPENCLAW --profile "$profile" plugins enable matrix >/dev/null 2>&1 || true

  # The plugin is installed into the profile dir (e.g. ~/.openclaw-<profile>/extensions/matrix)
  # but its npm deps are not guaranteed to be present. Install them if missing.
  local ext_dir="$HOME/.openclaw-${profile}/extensions/matrix"
  if [ -d "$ext_dir" ]; then
    if [ ! -d "$ext_dir/node_modules/@vector-im/matrix-bot-sdk" ]; then
      echo "[run] installing matrix plugin deps for profile=${profile}"

      # The plugin package.json includes a devDependency on "openclaw": "workspace:*".
      # When the plugin is copied into a profile directory, it is no longer in a workspace,
      # and npm will error even if we omit dev deps. Strip devDependencies to make installs reliable.
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

      (cd "$ext_dir" && run_timeout "$NPM" install --omit=dev >/dev/null)
    fi
  fi
}

echo "[run] preparing profiles"
log_step "prepare_profiles" "start"
ensure_profile_ready "$SELLER_PROFILE"
ensure_profile_ready "$BUYER_PROFILE"
log_step "prepare_profiles" "ok"

# 3) Configure Matrix channel for each profile

configure_matrix() {
  local profile="$1"
  local token="$2"
  local mxid="$3"

  run_timeout $OPENCLAW --profile "$profile" config set --json 'channels.matrix' "{ enabled: true, homeserver: '${HOMESERVER}', accessToken: '${token}', userId: '${mxid}', encryption: false, dm: { policy: 'open', allowFrom: ['*'] }, groupPolicy: 'open', groups: { '*': { requireMention: false }, '${MARKET_ROOM_ID}': { allow: true, requireMention: false } } }" >/dev/null
}

echo "[run] configuring matrix channel"
log_step "configure_matrix" "start"
configure_matrix "$SELLER_PROFILE" "$SELLER_TOKEN" "$SELLER_MXID"
configure_matrix "$BUYER_PROFILE" "$BUYER_TOKEN" "$BUYER_MXID"
log_step "configure_matrix" "ok"

# 4) Start gateways

echo "[run] starting openclaw gateways"
log_step "start_gateways" "start"
$OPENCLAW --profile "$SELLER_PROFILE" gateway run --port "$SELLER_GATEWAY_PORT" --token "$SELLER_GATEWAY_TOKEN" --force --compact --allow-unconfigured >"$OUT_DIR/gateway_${SELLER_PROFILE}.log" 2>&1 &
SELLER_PID=$!

$OPENCLAW --profile "$BUYER_PROFILE" gateway run --port "$BUYER_GATEWAY_PORT" --token "$BUYER_GATEWAY_TOKEN" --force --compact --allow-unconfigured >"$OUT_DIR/gateway_${BUYER_PROFILE}.log" 2>&1 &
BUYER_PID=$!

cleanup() {
  echo "[run] stopping gateways"
  kill "$SELLER_PID" "$BUYER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Give them time to connect to Matrix
if ! wait_port 127.0.0.1 "$SELLER_GATEWAY_PORT"; then
  log_step "start_gateways" "error" "seller gateway not ready"
  echo "seller gateway not ready" >&2
  exit 1
fi
if ! wait_port 127.0.0.1 "$BUYER_GATEWAY_PORT"; then
  log_step "start_gateways" "error" "buyer gateway not ready"
  echo "buyer gateway not ready" >&2
  exit 1
fi
log_step "start_gateways" "ok"

# 5) Inject missions

echo "[run] injecting missions"
log_step "inject_missions" "start"
run_timeout $OPENCLAW --profile "$SELLER_PROFILE" system event \
  --url "ws://127.0.0.1:${SELLER_GATEWAY_PORT}" \
  --token "$SELLER_GATEWAY_TOKEN" \
  --mode now \
  --text "MISSION: You are SWITCH_SELLER. You are selling a Nintendo Switch. Anchor price: 200€. Absolute floor: 150€. You may negotiate down, but never below 150€. Post ONE listing in the market room now. When contacted in DM, negotiate for up to 8 turns. Be concise, no roleplay fluff." \
  >/dev/null

run_timeout $OPENCLAW --profile "$BUYER_PROFILE" system event \
  --url "ws://127.0.0.1:${BUYER_GATEWAY_PORT}" \
  --token "$BUYER_GATEWAY_TOKEN" \
  --mode now \
  --text "MISSION: You are SWITCH_BUYER. You want to buy a Nintendo Switch. Max budget: 150€. Start offer: 120€. You can go up to 150€. Watch the market room; when you see a Switch listing, DM the seller within 1 minute. Negotiate for up to 8 turns. Ask condition + accessories + pickup/shipping. Be concise." \
  >/dev/null
log_step "inject_missions" "ok"

# 6) Seed market message as a deterministic kick (seller should also post, but this ensures the run starts)

echo "[run] seeding market listing"
log_step "seed_market" "start"
curl_retry "${HOMESERVER}/_matrix/client/v3/rooms/${MARKET_ROOM_ID}/send/m.room.message/txn$(date +%s)" \
  "PUT" \
  '{"msgtype":"m.text","body":"SELLING: nintendo switch — asking 200€ (can negotiate). DM me."}' \
  "${SELLER_TOKEN}"
log_step "seed_market" "ok"

# 7) Let them run

echo "[run] running for ${RUN_MINUTES} minutes"
sleep "$((RUN_MINUTES * 60))"

# 8) Export transcripts

echo "[run] exporting transcripts"
log_step "export_transcripts" "start"
cat >"$OUT_DIR/meta.json" <<META
{
  "homeserver": "${HOMESERVER}",
  "marketRoomId": "${MARKET_ROOM_ID}",
  "seller": { "profile": "${SELLER_PROFILE}", "mxid": "${SELLER_MXID}" },
  "buyer": { "profile": "${BUYER_PROFILE}", "mxid": "${BUYER_MXID}" },
  "runMinutes": ${RUN_MINUTES}
}
META

node ./scripts/export_transcripts.mjs "$OUT_DIR" "$OUT_DIR/meta.json"
log_step "export_transcripts" "ok"

echo "[run] done. outputs in $OUT_DIR"
echo "[run] run id: $RUN_ID"
