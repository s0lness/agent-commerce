#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" "$@"
    return
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    dc_path="$(command -v docker-compose)"
    if [[ "$dc_path" == /mnt/c/* ]]; then
      echo "[lab/down] NOTE: docker-compose resolves to a Windows binary ($dc_path); ignoring." >&2
    else
      docker-compose -f "$COMPOSE_FILE" "$@"
      return
    fi
  fi
  echo "[lab/down] ERROR: neither 'docker compose' nor 'docker-compose' is available." >&2
  exit 1
}

echo "[lab/down] stopping synapse + element (keeps volumes)"
compose down
