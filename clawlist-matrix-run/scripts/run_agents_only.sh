#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Runs the main harness but assumes Synapse is already up.
# Creates per-run room (if MATRIX_RUN_ID is set) and logs in for fresh tokens.

export BOOTSTRAP_MODE=agents
exec "$ROOT_DIR/run.sh"
