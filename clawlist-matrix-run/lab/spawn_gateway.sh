#!/usr/bin/env bash
set -euo pipefail

# Spawn an OpenClaw gateway for a given profile on a specified port (or pick a free one).
# Writes logs to runs/<runId>/out/.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${PROFILE:-${1:-}}"
[ -n "$PROFILE" ] || { echo "usage: spawn_gateway.sh <profile>" >&2; exit 2; }

RUN_ID="${RUN_ID:-$(date +%Y%m%d_%H%M%S)}"
OUT_DIR="$ROOT_DIR/runs/$RUN_ID/out"
mkdir -p "$OUT_DIR"

PORT="${PORT:-}"
TOKEN="${TOKEN:-token-${PROFILE}}"

port_in_use() {
  local port="$1"
  # NOTE: grep -E does NOT support \b as word-boundary (it matches backspace).
  # Use an explicit delimiter instead.
  ss -ltnH 2>/dev/null | grep -Eq "[:\]]${port}([[:space:]]|$)" && return 0
  return 1
}

pick_free_port() {
  local port="$1"
  while port_in_use "$port"; do port=$((port+1)); done
  echo "$port"
}

if [ -z "$PORT" ]; then
  PORT=$(pick_free_port 18791)
else
  if port_in_use "$PORT"; then
    echo "[spawn_gateway] ERROR: requested port $PORT is already in use. Stop the existing gateway or omit PORT to auto-pick." >&2
    exit 1
  fi
fi

LOG="$OUT_DIR/gateway_${PROFILE}.log"
PID_FILE="$OUT_DIR/gateway_${PROFILE}.pid"

echo "[spawn_gateway] profile=$PROFILE run_id=$RUN_ID port=$PORT log=$LOG"

OPENCLAW_GATEWAY_PORT="$PORT" OPENCLAW_GATEWAY_TOKEN="$TOKEN" \
  openclaw --profile "$PROFILE" gateway run --port "$PORT" --token "$TOKEN" --force --compact --allow-unconfigured >"$LOG" 2>&1 &
PID=$!

echo "$PORT" >"$OUT_DIR/gateway_${PROFILE}.port"

echo "[spawn_gateway] pid=$PID"

pid_from_log() {
  # Example line: listening on ws://127.0.0.1:18791 (PID 55556)
  sed -n 's/.*listening on ws:\/\/127\.0\.0\.1:'"$PORT"' (PID \([0-9]\+\)).*/\1/p' "$LOG" | tail -n 1
}

# Wait briefly for readiness by watching the gateway log.
# `ss` polling can be racy on some WSL builds.
for i in {1..150}; do
  if grep -q "listening on ws://127.0.0.1:${PORT} (PID" "$LOG" 2>/dev/null; then
    real_pid=$(pid_from_log || true)
    if [ -n "$real_pid" ]; then
      echo "$real_pid" >"$PID_FILE"
    else
      echo "$PID" >"$PID_FILE"
    fi
    exit 0
  fi
  sleep 0.2
done

echo "[spawn_gateway] ERROR: gateway did not become ready on port $PORT (see $LOG)" >&2
# best-effort cleanup
kill "$PID" >/dev/null 2>&1 || true
exit 1
