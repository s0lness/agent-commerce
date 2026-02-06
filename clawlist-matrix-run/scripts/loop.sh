#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MAX_RUNS="${MAX_RUNS:-10}"
RUN_MINUTES="${RUN_MINUTES:-2}"
STOP_ON_REPEAT="${STOP_ON_REPEAT:-3}"

last_sig=""
repeat_count=0

for ((i=1; i<=MAX_RUNS; i++)); do
  RUN_ID="$(date +%Y%m%d_%H%M%S)"
  export RUN_ID RUN_MINUTES

  echo "=========="
  echo "[loop] run $i/$MAX_RUNS (RUN_ID=$RUN_ID)"

  set +e
  "$ROOT_DIR/run.sh"
  rc=$?
  set -e

  OUT_DIR="$ROOT_DIR/runs/$RUN_ID/out"

  # Always recap (capture output so we can parse signature)
  recap_file="$ROOT_DIR/runs/$RUN_ID/recap.txt"
  "$ROOT_DIR/scripts/summarize_run.sh" "$OUT_DIR" | tee "$recap_file" || true

  # Extract signature
  sig=$(awk -F': ' '/^signature: /{print $2; exit}' "$recap_file" || true)

  # Stop if the run itself succeeded
  if [ "$rc" -eq 0 ]; then
    echo "[loop] success (rc=0). stopping loop."
    exit 0
  fi

  # Stop on deterministic failures (no point looping)
  if [[ "$sig" == DETERMINISTIC:* ]]; then
    echo "[loop] deterministic failure ($sig). stopping loop."
    exit "$rc"
  fi

  # Stop on repeated signature
  if [ "$sig" = "$last_sig" ] && [ -n "$sig" ]; then
    repeat_count=$((repeat_count + 1))
  else
    repeat_count=1
    last_sig="$sig"
  fi

  if [ "$repeat_count" -ge "$STOP_ON_REPEAT" ]; then
    echo "[loop] same failure repeated $repeat_count times ($sig). stopping loop."
    exit "$rc"
  fi

done

echo "[loop] hit MAX_RUNS=$MAX_RUNS without success."
exit 1
