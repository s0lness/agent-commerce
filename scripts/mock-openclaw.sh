#!/usr/bin/env bash
set -euo pipefail

# Minimal OpenClaw stub for deterministic demos/tests.
# It prints a single-line response based on the prompt content.

PROMPT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --message)
      PROMPT="$2"
      shift 2
      ;;
    *)
      shift 1
      ;;
  esac
done

if echo "$PROMPT" | rg -q "GOSSIP MESSAGE|GOSSIP LISTING"; then
  if echo "$PROMPT" | rg -q "LISTING_CREATE"; then
    echo "DM: Hey, I'm interested. What's the condition and what's included?"
  else
    echo "GOSSIP: LISTING_CREATE {\"id\":\"lst_mock_001\",\"type\":\"sell\",\"item\":\"Nintendo Switch\",\"price\":120,\"currency\":\"EUR\",\"condition\":\"good\",\"ship\":\"included\",\"location\":\"EU\"}"
  fi
  exit 0
fi

if echo "$PROMPT" | rg -q "Create your BUY listing"; then
  echo "GOSSIP: LISTING_CREATE {\"id\":\"lst_mock_buyer\",\"type\":\"buy\",\"item\":\"Nintendo Switch\",\"price\":120,\"currency\":\"EUR\",\"condition\":\"good\",\"ship\":\"included\",\"location\":\"EU\"}"
  exit 0
fi

if echo "$PROMPT" | rg -q "Create your SELL listing"; then
  echo "GOSSIP: LISTING_CREATE {\"id\":\"lst_mock_seller\",\"type\":\"sell\",\"item\":\"Nintendo Switch\",\"price\":120,\"currency\":\"EUR\",\"condition\":\"good\",\"ship\":\"included\",\"location\":\"EU\"}"
  exit 0
fi

if echo "$PROMPT" | rg -q "DM MESSAGE"; then
  # Simple deterministic negotiation flow.
  if echo "$PROMPT" | rg -q "Deal Summary"; then
    echo "DM: Confirmed"
  elif echo "$PROMPT" | rg -q "\\$140|140"; then
    echo "DM: Can you do $150 shipped with tracked signature?"
  else
    echo "DM: $150 shipped with tracked signature?"
  fi
  exit 0
fi

echo "SKIP"
