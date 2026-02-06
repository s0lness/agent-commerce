#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SYNAPSE_DIR="$ROOT_DIR/synapse-data2"

SELLER_USER="switch_seller"
BUYER_USER="switch_buyer"
SELLER_PASS="SellerPass123!"
BUYER_PASS="BuyerPass123!"

MATRIX_PORT="${MATRIX_PORT:-18008}"
MATRIX_REUSE="${MATRIX_REUSE:-1}"
BOOTSTRAP_MODE="${BOOTSTRAP_MODE:-full}" # full|agents|up

MATRIX_RUN_ID="${MATRIX_RUN_ID:-}" # optional; used for per-run room alias

container_running() {
  docker ps --format '{{.Names}}' | grep -qx 'clawlist-synapse'
}

ensure_synapse_config() {
  if [ ! -f "$SYNAPSE_DIR/homeserver.yaml" ]; then
    mkdir -p "$SYNAPSE_DIR"
    echo "[bootstrap] generating synapse config in $SYNAPSE_DIR"
    docker run --rm \
      -u "$(id -u):$(id -g)" \
      -e SYNAPSE_SERVER_NAME=localhost \
      -e SYNAPSE_REPORT_STATS=no \
      -v "$SYNAPSE_DIR:/data" \
      matrixdotorg/synapse:latest generate

    # Make registration easy for local runs
    if ! grep -q "^enable_registration:" "$SYNAPSE_DIR/homeserver.yaml"; then
      echo "enable_registration: true" >> "$SYNAPSE_DIR/homeserver.yaml"
    fi

    if ! grep -q "^enable_registration_without_verification:" "$SYNAPSE_DIR/homeserver.yaml"; then
      echo "enable_registration_without_verification: true" >> "$SYNAPSE_DIR/homeserver.yaml"
    fi
  fi
}

start_synapse_if_needed() {
  ensure_synapse_config

  if container_running; then
    if [ "$MATRIX_REUSE" = "1" ]; then
      echo "[bootstrap] synapse already running (reuse=1)"
      return 0
    fi
    echo "[bootstrap] replacing existing synapse container (reuse=0)"
    docker rm -f clawlist-synapse >/dev/null 2>&1 || true
  fi

  echo "[bootstrap] starting synapse on port ${MATRIX_PORT}"
  docker run -d \
    --name clawlist-synapse \
    -p "${MATRIX_PORT}:8008" \
    -e SYNAPSE_SERVER_NAME=localhost \
    -e SYNAPSE_REPORT_STATS=no \
    -v "$SYNAPSE_DIR:/data" \
    matrixdotorg/synapse:latest >/dev/null
}

wait_for_synapse() {
  echo "[bootstrap] waiting for synapse to respond on port ${MATRIX_PORT}"
  for i in {1..60}; do
    if curl -fsS "http://127.0.0.1:${MATRIX_PORT}/_matrix/client/versions" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  echo "synapse did not become ready" >&2
  return 1
}

create_users() {
  echo "[bootstrap] creating users (ignore 'User ID already taken')"
  docker exec -i clawlist-synapse register_new_matrix_user \
    -c /data/homeserver.yaml http://127.0.0.1:8008 \
    -u "$SELLER_USER" -p "$SELLER_PASS" --no-admin || true

  docker exec -i clawlist-synapse register_new_matrix_user \
    -c /data/homeserver.yaml http://127.0.0.1:8008 \
    -u "$BUYER_USER" -p "$BUYER_PASS" --no-admin || true
}

login() {
  echo "[bootstrap] logging in"
  local seller_login buyer_login

  seller_login=$(curl -fsS -X POST "http://127.0.0.1:${MATRIX_PORT}/_matrix/client/v3/login" \
    -H 'Content-Type: application/json' \
    -d '{"type":"m.login.password","identifier":{"type":"m.id.user","user":"'"$SELLER_USER"'"},"password":"'"$SELLER_PASS"'"}')

  buyer_login=$(curl -fsS -X POST "http://127.0.0.1:${MATRIX_PORT}/_matrix/client/v3/login" \
    -H 'Content-Type: application/json' \
    -d '{"type":"m.login.password","identifier":{"type":"m.id.user","user":"'"$BUYER_USER"'"},"password":"'"$BUYER_PASS"'"}')

  SELLER_TOKEN=$(node -e 'const x=JSON.parse(process.argv[1]); process.stdout.write(x.access_token||"")' "$seller_login")
  BUYER_TOKEN=$(node -e 'const x=JSON.parse(process.argv[1]); process.stdout.write(x.access_token||"")' "$buyer_login")

  if [ -z "${SELLER_TOKEN:-}" ] || [ -z "${BUYER_TOKEN:-}" ]; then
    echo "failed to get access tokens" >&2
    exit 1
  fi

  export SELLER_TOKEN BUYER_TOKEN
}

ensure_room() {
  local room_alias room_name room_alias_name

  if [ -n "$MATRIX_RUN_ID" ]; then
    room_alias="#market-${MATRIX_RUN_ID}:localhost"
    room_name="market-${MATRIX_RUN_ID}"
    room_alias_name="market-${MATRIX_RUN_ID}"
  else
    room_alias="#market:localhost"
    room_name="market"
    room_alias_name="market"
  fi

  echo "[bootstrap] creating (or reusing) market room alias=${room_alias}"

  local create_room room_id encoded_alias resolve
  create_room=$(curl -fsS -X POST "http://127.0.0.1:${MATRIX_PORT}/_matrix/client/v3/createRoom" \
    -H "Authorization: Bearer $SELLER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{
      "preset":"public_chat",
      "name":"'"$room_name"'",
      "room_alias_name":"'"$room_alias_name"'",
      "topic":"clawlist market run",
      "visibility":"public"
    }' || true)

  room_id=$(node -e 'try{const x=JSON.parse(process.argv[1]); process.stdout.write(x.room_id||"")}catch{process.stdout.write("")}' "$create_room")

  if [ -z "$room_id" ]; then
    encoded_alias=$(node -p 'encodeURIComponent(process.argv[1])' "$room_alias")
    resolve=$(curl -fsS "http://127.0.0.1:${MATRIX_PORT}/_matrix/client/v3/directory/room/${encoded_alias}")
    room_id=$(node -e 'const x=JSON.parse(process.argv[1]); process.stdout.write(x.room_id||"")' "$resolve")
  fi

  if [ -z "$room_id" ]; then
    echo "failed to create/resolve market room" >&2
    echo "$create_room" >&2
    exit 1
  fi

  ROOM_ID="$room_id"
  ROOM_ALIAS="$room_alias"
  export ROOM_ID ROOM_ALIAS
}

ensure_membership() {
  echo "[bootstrap] inviting/joining buyer"
  BUYER_MXID="@${BUYER_USER}:localhost"
  SELLER_MXID="@${SELLER_USER}:localhost"
  export BUYER_MXID SELLER_MXID

  curl -fsS -X POST "http://127.0.0.1:${MATRIX_PORT}/_matrix/client/v3/rooms/${ROOM_ID}/invite" \
    -H "Authorization: Bearer $SELLER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"user_id":"'"$BUYER_MXID"'"}' >/dev/null || true

  curl -fsS -X POST "http://127.0.0.1:${MATRIX_PORT}/_matrix/client/v3/rooms/${ROOM_ID}/join" \
    -H "Authorization: Bearer $BUYER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{}' >/dev/null || true
}

if [ "$BOOTSTRAP_MODE" = "up" ]; then
  start_synapse_if_needed
  wait_for_synapse
  echo "MATRIX_PORT=$MATRIX_PORT"
  echo "HOMESERVER=http://127.0.0.1:${MATRIX_PORT}"
  exit 0
fi

if [ "$BOOTSTRAP_MODE" = "agents" ]; then
  # Assume synapse is already running and reachable.
  wait_for_synapse
  create_users
  login
  ensure_room
  ensure_membership
else
  start_synapse_if_needed
  wait_for_synapse
  create_users
  login
  ensure_room
  ensure_membership
fi

# Print shell-friendly exports for the caller (run.sh)
echo "MATRIX_PORT=$MATRIX_PORT"
echo "HOMESERVER=http://127.0.0.1:${MATRIX_PORT}"
echo "ROOM_ID=$ROOM_ID"
echo "ROOM_ALIAS=$ROOM_ALIAS"
echo "SELLER_TOKEN=$SELLER_TOKEN"
echo "BUYER_TOKEN=$BUYER_TOKEN"
echo "SELLER_MXID=@${SELLER_USER}:localhost"
echo "BUYER_MXID=@${BUYER_USER}:localhost"
