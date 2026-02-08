#!/usr/bin/env bash
set -euo pipefail

# Wrapper for DM monitoring - runs periodically to check for new Matrix DMs
# Usage: ./lab/operator_dm_monitor.sh [--loop]
# Options:
#   --loop: Run continuously every 60 seconds
#   (default): Run once and exit

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOOP=false
[ "${1:-}" = "--loop" ] && LOOP=true

run_check() {
  node "$ROOT_DIR/src/dm-monitor.mjs"
}

if [ "$LOOP" = true ]; then
  echo "[operator_dm_monitor] Starting continuous DM monitoring (60s interval)" >&2
  while true; do
    run_check || true
    sleep 60
  done
else
  run_check
fi
