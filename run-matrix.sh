#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[run] checking docker"
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop (or Docker service) and retry." >&2
  exit 1
fi

echo "[run] checking openclaw"
# Allow OPENCLAW override (useful when openclaw isn't in PATH)
OPENCLAW_BIN="${OPENCLAW:-}"
if [ -z "$OPENCLAW_BIN" ]; then
  OPENCLAW_BIN="$(command -v openclaw 2>/dev/null || true)"
fi
if [ -z "$OPENCLAW_BIN" ] || [ ! -x "$OPENCLAW_BIN" ]; then
  echo "openclaw not found in PATH and OPENCLAW not set. Install it, add to PATH, or run: OPENCLAW=/path/to/openclaw ./run-matrix.sh" >&2
  exit 1
fi
export OPENCLAW="$OPENCLAW_BIN"

echo "[run] starting matrix run harness"
cd "$ROOT_DIR/clawlist-matrix-run"

# You can pass knobs through env vars, e.g.:
#   RUN_MINUTES=15 ./run-matrix.sh
#   RUN_ID=my_run   ./run-matrix.sh
./run.sh
