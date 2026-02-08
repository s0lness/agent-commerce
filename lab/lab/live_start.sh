#!/usr/bin/env bash
set -euo pipefail

# Start live sandbox mode from scratch (idempotent)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[live_start] Starting live sandbox mode..."
echo

# 1. Start Matrix infra
echo "[live_start] 1/5 Starting Matrix infra..."
./lab/up.sh

# 2. Bootstrap users + market room (idempotent)
echo
echo "[live_start] 2/5 Bootstrapping users and market room..."
./lab/bootstrap.sh

# 3. Set up operator bot config (idempotent)
echo
echo "[live_start] 3/5 Configuring operator bot..."
./lab/operator_setup.sh

# 4. Start operator bot (if not already running)
echo
echo "[live_start] 4/5 Starting operator bot..."
if curl -sf http://127.0.0.1:18795 >/dev/null 2>&1; then
  echo "[live_start] operator bot already running"
else
  ./lab/operator_up.sh
fi

# 5. Populate market (optional - only if requested)
POPULATE="${POPULATE:-0}"
if [ "$POPULATE" != "0" ]; then
  echo
  echo "[live_start] 5/5 Populating market with $POPULATE listings..."
  ./lab/populate_market.sh "$POPULATE"
else
  echo
  echo "[live_start] 5/5 Skipping market population (set POPULATE=8 to auto-populate)"
fi

echo
echo "=== Live Sandbox Ready ==="
./lab/live_status.sh
