#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "[lab/up] ERROR: docker not found" >&2
  exit 1
fi

# Prefer docker compose v2, fall back to docker-compose.
# (Some distros ship `docker` without the compose plugin.)
compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" "$@"
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    dc_path="$(command -v docker-compose)"
    # If this points to Docker Desktop's Windows binary under /mnt/c, it won't run reliably in WSL.
    if [[ "$dc_path" == /mnt/c/* ]]; then
      echo "[lab/up] NOTE: docker-compose resolves to a Windows binary ($dc_path); ignoring." >&2
    else
      docker-compose -f "$COMPOSE_FILE" "$@"
      return
    fi
  fi
  echo "[lab/up] ERROR: neither 'docker compose' (compose plugin) nor 'docker-compose' is available." >&2
  echo "[lab/up] Install one of them, e.g.:" >&2
  echo "[lab/up]   sudo apt-get update && sudo apt-get install -y docker-compose-plugin" >&2
  echo "[lab/up] or:" >&2
  echo "[lab/up]   sudo apt-get update && sudo apt-get install -y docker-compose" >&2
  exit 1
}

echo "[lab/up] starting synapse + element (local-only)"
compose up -d

HS="http://127.0.0.1:18008"
UI="http://127.0.0.1:18080"

echo "[lab/up] waiting for synapse at $HS"
for i in {1..60}; do
  if curl -fsS "$HS/_matrix/client/versions" >/dev/null 2>&1; then
    echo "[lab/up] synapse is up"
    break
  fi
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo "[lab/up] ERROR: synapse did not become ready" >&2
    exit 1
  fi
done

echo "[lab/up] UI: $UI"
