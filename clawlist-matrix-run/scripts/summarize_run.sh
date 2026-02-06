#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-}"
[ -n "$OUT_DIR" ] || { echo "usage: summarize_run.sh <out_dir>" >&2; exit 2; }

SELLER_LOG="$OUT_DIR/gateway_switch-seller.log"
BUYER_LOG="$OUT_DIR/gateway_switch-buyer.log"
BOOT_RAW="$OUT_DIR/bootstrap.raw"

first_match() {
  local file="$1"; shift
  [ -f "$file" ] || return 0
  grep -nE "$*" "$file" | head -n 1 || true
}

classify() {
  # deterministic infra errors first
  if first_match "$SELLER_LOG" "Port [0-9]+ is already in use|already listening" >/dev/null; then
    echo "DETERMINISTIC:PORT_IN_USE"; return
  fi
  if first_match "$BUYER_LOG" "Port [0-9]+ is already in use|already listening" >/dev/null; then
    echo "DETERMINISTIC:PORT_IN_USE"; return
  fi
  if first_match "$SELLER_LOG" "auth.*enabled.*token.*missing|no token configured" >/dev/null; then
    echo "DETERMINISTIC:MISSING_GATEWAY_TOKEN"; return
  fi
  if first_match "$BOOT_RAW" "whoami http (401|403)|token invalid" >/dev/null; then
    echo "DETERMINISTIC:MATRIX_TOKEN"; return
  fi
  if first_match "$BOOT_RAW" "synapse did not become ready" >/dev/null; then
    echo "TRANSIENT:SYNPASE_NOT_READY"; return
  fi
  echo "UNKNOWN"
}

sig="$(classify)"

echo "--- run recap ($OUT_DIR)"
echo "signature: $sig"

if [ -f "$OUT_DIR/meta.json" ]; then
  echo "meta: $(cat "$OUT_DIR/meta.json" | tr -d '\n' | head -c 400)"
fi

if [ -f "$BOOT_RAW" ]; then
  echo "bootstrap.raw (tail):"
  tail -n 30 "$BOOT_RAW" || true
fi

if [ -f "$SELLER_LOG" ]; then
  echo "seller gateway log (tail):"
  tail -n 40 "$SELLER_LOG" || true
fi

if [ -f "$BUYER_LOG" ]; then
  echo "buyer gateway log (tail):"
  tail -n 40 "$BUYER_LOG" || true
fi

case "$sig" in
  DETERMINISTIC:PORT_IN_USE)
    echo "what to fix: stop any running openclaw gateway service/process that is binding the default port(s); rerun." ;;
  DETERMINISTIC:MISSING_GATEWAY_TOKEN)
    echo "what to fix: set gateway.auth.token for the profiles or pass --token; ensure harness passes tokens consistently." ;;
  DETERMINISTIC:MATRIX_TOKEN)
    echo "what to fix: synapse bootstrap/login produced invalid tokens; inspect bootstrap.raw; check server readiness and user/password." ;;
  TRANSIENT:SYNPASE_NOT_READY)
    echo "what to fix: likely transient synapse startup; consider increasing TIMEOUT_MATRIX_READY_SEC or checking docker resource limits." ;;
  *)
    echo "what to fix: inspect logs above; consider adding a new classifier for the first recurring error." ;;
esac
