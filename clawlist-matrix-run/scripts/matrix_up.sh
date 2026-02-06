#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Boots (or reuses) Synapse and waits until it's ready.
# Outputs HOMESERVER/MATRIX_PORT for convenience.

export BOOTSTRAP_MODE=up
export MATRIX_REUSE="${MATRIX_REUSE:-1}"

./scripts/bootstrap_matrix.sh

echo "[matrix_up] ready"
