#!/usr/bin/env bash
set -euo pipefail

# Stop live sandbox mode (but keep data)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[live_stop] Stopping live sandbox mode..."
echo

# 1. Stop operator bot
echo "[live_stop] 1/2 Stopping operator bot..."
if OPERATOR_PID=$(lsof -ti:18795 2>/dev/null | head -1); then
  echo "[live_stop] killing operator bot (pid: $OPERATOR_PID)"
  kill "$OPERATOR_PID" || true
  sleep 1
else
  echo "[live_stop] operator bot not running"
fi

# 2. Stop Matrix infra (optional - keeps data)
STOP_MATRIX="${STOP_MATRIX:-yes}"
if [ "$STOP_MATRIX" = "yes" ]; then
  echo
  echo "[live_stop] 2/2 Stopping Matrix infra..."
  ./lab/down.sh
else
  echo
  echo "[live_stop] 2/2 Keeping Matrix infra running (set STOP_MATRIX=yes to stop)"
fi

echo
echo "[live_stop] Done. Data preserved in docker volumes."
echo "[live_stop] Restart with: ./lab/live_start.sh"
