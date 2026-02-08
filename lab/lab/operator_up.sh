#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${PROFILE:-operator-bot}"
PORT="${PORT:-18795}"
GATEWAY_TOKEN="${GATEWAY_TOKEN:-token-operator-bot}"

OUT_DIR="$ROOT_DIR/runs/operator/out"
mkdir -p "$OUT_DIR"
LOG="$OUT_DIR/gateway_${PROFILE}.log"
PID_FILE="$OUT_DIR/gateway_${PROFILE}.pid"

# Avoid collisions
ss -ltnH 2>/dev/null | grep -Eq "[:\]]${PORT}\\b" && { echo "[operator_up] ERROR: port $PORT in use" >&2; exit 1; }

echo "[operator_up] starting operator gateway profile=$PROFILE on ws://127.0.0.1:$PORT (log=$LOG)"
OPENCLAW_GATEWAY_PORT="$PORT" OPENCLAW_GATEWAY_TOKEN="$GATEWAY_TOKEN" \
  openclaw --profile "$PROFILE" gateway run --port "$PORT" --token "$GATEWAY_TOKEN" --force --compact --allow-unconfigured >"$LOG" 2>&1 &
PID=$!
echo "$PID" >"$PID_FILE"

echo "[operator_up] pid=$PID"
