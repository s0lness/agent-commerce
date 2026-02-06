#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_ID="${RUN_ID:-${1:-}}"
[ -n "$RUN_ID" ] || { echo "usage: score.sh <runId>" >&2; exit 2; }

OUT_DIR="$ROOT_DIR/runs/$RUN_ID/out"
[ -d "$OUT_DIR" ] || { echo "[score.sh] ERROR: missing $OUT_DIR" >&2; exit 1; }

node "$ROOT_DIR/eval/score_run.mjs" "$OUT_DIR"
