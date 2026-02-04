#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$REPO_ROOT/logs"

if ! pgrep -f "node scripts/ui-server.js" >/dev/null 2>&1; then
  nohup env UI_HOST=127.0.0.1 node "$REPO_ROOT/scripts/ui-server.js" > "$REPO_ROOT/logs/ui.log" 2>&1 &
  sleep 0.5
  if ! curl -sSf http://127.0.0.1:8090 >/dev/null 2>&1; then
    echo "UI failed to start (see logs/ui.log)."
  fi
fi

if [ -e "$REPO_ROOT/logs/gossip.log" ] && [ ! -w "$REPO_ROOT/logs/gossip.log" ]; then
  rm -f "$REPO_ROOT/logs/gossip.log"
fi
if [ -e "$REPO_ROOT/logs/dm.log" ] && [ ! -w "$REPO_ROOT/logs/dm.log" ]; then
  rm -f "$REPO_ROOT/logs/dm.log"
fi

mode="llm-buyer"
if [ -t 0 ]; then
  echo "Choose OpenClaw mode: [1] buyer (default) or [2] seller"
  read -r -p "> " choice || true
  case "${choice:-}" in
    2|seller|llm-seller) mode="llm-seller" ;;
    1|buyer|llm-buyer|"") mode="llm-buyer" ;;
    *) echo "Unrecognized choice, defaulting to buyer." ;;
  esac
else
  echo "No TTY detected, defaulting to OpenClaw buyer."
fi

roles_file="$REPO_ROOT/logs/roles.json"
if [ "$mode" = "llm-seller" ]; then
  cat > "$roles_file" <<'JSON'
{"buyer":"@agent_b:localhost","seller":"@agent_a:localhost","llm":"@agent_a:localhost","mode":"llm-seller"}
JSON
else
  cat > "$roles_file" <<'JSON'
{"buyer":"@agent_b:localhost","seller":"@agent_a:localhost","llm":"@agent_b:localhost","mode":"llm-buyer"}
JSON
fi

demo_cmd="npm run demo:${mode}"

if curl -sSf http://localhost:8008/_matrix/client/versions >/dev/null 2>&1; then
  $demo_cmd
  exit 0
fi

docker run --rm --network container:synapse \
  -v "$REPO_ROOT:/app" \
  -w /app \
  --user "$(id -u):$(id -g)" \
  node:20 $demo_cmd
