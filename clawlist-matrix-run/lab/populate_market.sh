#!/usr/bin/env bash
set -euo pipefail

# Populate the market with background seller agents.
# Usage: ./lab/populate_market.sh [num_sellers]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NUM_SELLERS="${1:-5}"
source "$ROOT_DIR/.local/bootstrap.env"

echo "[populate_market] spawning $NUM_SELLERS background sellers into #market:localhost"

ITEMS=(
  "Nintendo Switch|150|Good condition, includes dock and Joy-Cons"
  "iPhone 13|400|128GB, excellent condition, battery 90%"
  "PS5|450|Digital edition, barely used, includes controller"
  "MacBook Air M1|800|8GB RAM, 256GB SSD, 2 years old"
  "iPad Pro 11\"|500|2021 model, 128GB, with Apple Pencil"
  "AirPods Pro|150|Barely used, includes charging case"
  "Gaming PC|1200|RTX 3070, Ryzen 5800X, 32GB RAM"
  "Bike|200|Mountain bike, 21 gears, well maintained"
  "Coffee Machine|80|Nespresso, works perfectly"
  "Herman Miller Chair|600|Aeron, size B, excellent condition"
)

for i in $(seq 1 "$NUM_SELLERS"); do
  ITEM_IDX=$((RANDOM % ${#ITEMS[@]}))
  IFS='|' read -r ITEM PRICE DESC <<< "${ITEMS[$ITEM_IDX]}"
  
  # Use switch_seller for now (could create more users if needed)
  # Just send a mission to post
  MESSAGE="Post to #market:localhost: SELLING: $ITEM. Price: ${PRICE}€. $DESC. DM me if interested."
  
  echo "[populate_market] seller $i: $ITEM (${PRICE}€)"
  
  # This would need a running gateway for switch_seller
  # For now, let's just use curl to post directly
  source "$ROOT_DIR/.local/secrets.env"
  
  curl -s -X POST "http://127.0.0.1:18008/_matrix/client/v3/rooms/${ROOM_ID}/send/m.room.message" \
    -H "Authorization: Bearer ${SELLER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"msgtype\":\"m.text\",\"body\":\"SELLING: $ITEM. Price: ${PRICE}€. $DESC. DM me if interested.\"}" \
    >/dev/null
  
  sleep 1
done

echo "[populate_market] done: posted $NUM_SELLERS listings to #market:localhost"
echo "[populate_market] view at: http://127.0.0.1:18080"
