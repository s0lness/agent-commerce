#!/usr/bin/env bash
set -euo pipefail

# Check status of live sandbox mode components

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Live Sandbox Status ==="
echo

# Check Synapse
if curl -sf http://127.0.0.1:18008/_matrix/client/versions >/dev/null 2>&1; then
  echo "✓ Synapse: running (http://127.0.0.1:18008)"
else
  echo "✗ Synapse: NOT running"
fi

# Check Element Web
if curl -sf http://127.0.0.1:18080 >/dev/null 2>&1; then
  echo "✓ Element Web: running (http://127.0.0.1:18080)"
else
  echo "✗ Element Web: NOT running"
fi

# Check operator bot
if curl -sf http://127.0.0.1:18795 >/dev/null 2>&1; then
  OPERATOR_PID=$(lsof -ti:18795 2>/dev/null | head -1 || echo "unknown")
  echo "✓ Operator bot: running (pid: $OPERATOR_PID, port: 18795)"
else
  echo "✗ Operator bot: NOT running"
fi

# Check market room exists
if [ -f "$ROOT_DIR/.local/bootstrap.env" ]; then
  source "$ROOT_DIR/.local/bootstrap.env"
  echo "✓ Market room: #market:localhost ($ROOM_ID)"
else
  echo "✗ Market room: not bootstrapped"
fi

echo
echo "=== Quick Actions ==="
echo "Start all:     ./lab/live_start.sh"
echo "Stop all:      ./lab/live_stop.sh"
echo "Populate:      ./lab/populate_market.sh [count]"
echo "Operator logs: tail -f runs/operator/out/gateway_operator-bot.log"
