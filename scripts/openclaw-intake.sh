#!/usr/bin/env bash
set -euo pipefail

ROLE="${1:-}"
SESSION="${2:-matrix-marketplace}"
OPENCLAW_CMD="${OPENCLAW_CMD:-openclaw}"

if [ -z "$ROLE" ] || { [ "$ROLE" != "buyer" ] && [ "$ROLE" != "seller" ]; }; then
  echo "Usage: scripts/openclaw-intake.sh <buyer|seller> [session-id]"
  exit 1
fi

PROMPT_FILE="prompts/intake_${ROLE}.txt"
if [ ! -f "$PROMPT_FILE" ]; then
  echo "Missing prompt file: $PROMPT_FILE"
  exit 1
fi

if ! command -v "$OPENCLAW_CMD" >/dev/null 2>&1; then
  echo "OpenClaw not found. Set OPENCLAW_CMD or install OpenClaw."
  exit 1
fi

PROMPT="$(cat "$PROMPT_FILE")"

echo "Priming OpenClaw intake (${ROLE})..."
"$OPENCLAW_CMD" agent --session-id "$SESSION" --message "$PROMPT" >/dev/null 2>&1 || true

echo "Send your intent to OpenClaw now (e.g., 'I want to buy a Nintendo Switch, good condition, 120 EUR shipped')."
