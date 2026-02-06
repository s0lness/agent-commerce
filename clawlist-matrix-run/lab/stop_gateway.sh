#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${PROFILE:-${1:-}}"
RUN_ID="${RUN_ID:-${2:-}}"
[ -n "$PROFILE" ] || { echo "usage: stop_gateway.sh <profile> <runId>" >&2; exit 2; }
[ -n "$RUN_ID" ] || { echo "usage: stop_gateway.sh <profile> <runId>" >&2; exit 2; }

PID_FILE="$ROOT_DIR/runs/$RUN_ID/out/gateway_${PROFILE}.pid"
if [ ! -f "$PID_FILE" ]; then
  echo "[stop_gateway] no pid file: $PID_FILE" >&2
  exit 0
fi
PID=$(cat "$PID_FILE" || true)
if [ -z "$PID" ]; then
  echo "[stop_gateway] empty pid file: $PID_FILE" >&2
  exit 0
fi

if kill -0 "$PID" 2>/dev/null; then
  echo "[stop_gateway] stopping profile=$PROFILE pid=$PID"
  kill "$PID" || true
else
  echo "[stop_gateway] pid not running: $PID" >&2
fi
