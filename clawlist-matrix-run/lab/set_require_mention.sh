#!/usr/bin/env bash
set -euo pipefail

# Toggle Matrix mention-gating for a given profile in the stable market room.
#
# usage:
#   ./lab/set_require_mention.sh <profile> <true|false>

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${1:-}"
VAL="${2:-}"
[ -n "$PROFILE" ] || { echo "usage: set_require_mention.sh <profile> <true|false>" >&2; exit 2; }
[ "$VAL" = "true" ] || [ "$VAL" = "false" ] || { echo "[set_require_mention] ERROR: val must be true|false" >&2; exit 2; }

source "$ROOT_DIR/.local/bootstrap.env"
ROOM_ID="${ROOM_ID:?missing ROOM_ID}"

openclaw --profile "$PROFILE" config set --json 'channels.matrix.groups' \
  "{ '*': { requireMention: true }, '${ROOM_ID}': { allow: true, requireMention: ${VAL} } }" \
  >/dev/null

echo "[set_require_mention] profile=$PROFILE room=$ROOM_ID requireMention=$VAL"