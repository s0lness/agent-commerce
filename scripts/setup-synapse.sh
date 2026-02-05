#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT_DIR/synapse"
SERVER_NAME="${SYNAPSE_SERVER_NAME:-home.local}"

mkdir -p "$DATA_DIR"

echo "Generating Synapse config in $DATA_DIR..."
docker run -it --rm \
  -v "$DATA_DIR:/data" \
  -e SYNAPSE_SERVER_NAME="$SERVER_NAME" \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate

echo "Creating docker-compose.yml..."
cat > "$ROOT_DIR/docker-compose.yml" << EOF
version: "3.8"
services:
  synapse:
    image: matrixdotorg/synapse:latest
    container_name: synapse
    ports:
      - "8008:8008"
    environment:
      - SYNAPSE_SERVER_NAME=$SERVER_NAME
      - SYNAPSE_REPORT_STATS=no
    volumes:
      - ./synapse:/data
EOF

echo "Starting Synapse..."
docker compose up -d

echo "Writing matrix.env..."
cat > "$ROOT_DIR/matrix.env" << EOF
MATRIX_SERVER=http://localhost:8008
SERVER_NAME=$SERVER_NAME
EOF

echo ""
echo "Synapse running on http://localhost:8008"
echo "To create users:"
echo "  docker exec -it synapse register_new_matrix_user -c /data/homeserver.yaml http://localhost:8008"
