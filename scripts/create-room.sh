#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <room-name> [--public|--private]"
  echo "Example: $0 gossip --public"
  exit 1
fi

ROOM_NAME="$1"
VISIBILITY="${2:---private}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/matrix.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: matrix.env not found. Run ./scripts/setup-synapse.sh first."
  exit 1
fi

source "$ENV_FILE"

if [ -z "$MATRIX_SERVER" ]; then
  echo "ERROR: MATRIX_SERVER not set in matrix.env"
  exit 1
fi

if [ -z "$MATRIX_USER" ] || [ -z "$MATRIX_PASSWORD" ]; then
  echo "ERROR: Set MATRIX_USER and MATRIX_PASSWORD in your shell."
  echo "Example: MATRIX_USER='@agent_a:$SERVER_NAME' MATRIX_PASSWORD='pass' $0 $ROOM_NAME $VISIBILITY"
  exit 1
fi

ROOM_ALIAS="${ROOM_NAME}"
ROOM_ALIAS_LOCALPART="${ROOM_ALIAS#\#}"

VIS="private"
PRESET="private_chat"
if [ "$VISIBILITY" == "--public" ]; then
  VIS="public"
  PRESET="public_chat"
fi

echo "Logging in as $MATRIX_USER..."
LOGIN_RESPONSE=$(curl -s -X POST "$MATRIX_SERVER/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"user\":\"$MATRIX_USER\",\"password\":\"$MATRIX_PASSWORD\"}")

ACCESS_TOKEN=$(python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" <<< "$LOGIN_RESPONSE")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "ERROR: Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Creating room $ROOM_NAME ($VIS)..."
ROOM_RESPONSE=$(curl -s -X POST "$MATRIX_SERVER/_matrix/client/v3/createRoom" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"room_alias_name\":\"$ROOM_ALIAS_LOCALPART\",\"name\":\"$ROOM_NAME\",\"visibility\":\"$VIS\",\"preset\":\"$PRESET\"}")

ROOM_ID=$(python3 -c "import sys,json; print(json.load(sys.stdin).get('room_id',''))" <<< "$ROOM_RESPONSE")

if [ -z "$ROOM_ID" ]; then
  echo "ERROR: Room creation failed. Response: $ROOM_RESPONSE"
  exit 1
fi

mkdir -p "$ROOT_DIR/rooms"
cat > "$ROOT_DIR/rooms/$ROOM_NAME.json" << EOF
{
  "room_id": "$ROOM_ID",
  "room_name": "$ROOM_NAME",
  "visibility": "$VIS"
}
EOF

echo "Room created: $ROOM_ID"
echo "Saved to: $ROOT_DIR/rooms/$ROOM_NAME.json"
