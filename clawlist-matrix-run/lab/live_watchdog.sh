#!/usr/bin/env bash
set -euo pipefail

# Watchdog to keep operator bot alive
# Usage: ./lab/live_watchdog.sh &
# Or add to cron: */5 * * * * cd ~/clawlist/clawlist-matrix-run && ./lab/live_watchdog.sh >/dev/null 2>&1

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Check if operator bot is running
if curl -sf http://127.0.0.1:18795 >/dev/null 2>&1; then
  # Running, all good
  exit 0
fi

echo "[live_watchdog] operator bot down, restarting..." >&2

# Ensure Matrix is up
if ! curl -sf http://127.0.0.1:18008/_matrix/client/versions >/dev/null 2>&1; then
  echo "[live_watchdog] Matrix is down, starting..." >&2
  ./lab/up.sh >/dev/null 2>&1
fi

# Restart operator
./lab/operator_up.sh >/dev/null 2>&1

echo "[live_watchdog] operator bot restarted" >&2
