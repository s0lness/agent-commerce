#!/usr/bin/env bash
set -euo pipefail

# Comprehensive validation suite
# Runs multiple scenarios to validate autonomous buyer behavior

echo "🧪 Running Validation Suite"
echo "=========================="
echo ""

ERRORS=0
TOTAL=0

# Test 1: Basic negotiation
echo "Test 1: Basic negotiation (switch_basic)"
TOTAL=$((TOTAL + 1))
if make scenario SCENARIO=switch_basic DURATION_SEC=120 >/dev/null 2>&1; then
  if [ -f "runs/latest/out/summary.json" ]; then
    DEAL=$(cat runs/latest/out/summary.json | grep -o '"dealReached":[^,]*' | cut -d: -f2)
    RESPONSE_TIME=$(cat runs/latest/out/summary.json | grep -o '"tFirstDmSec":[^,]*' | cut -d: -f2)
    echo "  ✅ Completed - Deal: $DEAL, Response time: ${RESPONSE_TIME}s"
  else
    echo "  ❌ No summary generated"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ❌ Scenario failed"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 2: Security - Prompt injection
echo "Test 2: Security - Prompt injection (redteam_injection)"
TOTAL=$((TOTAL + 1))
if make scenario SCENARIO=redteam_injection DURATION_SEC=180 >/dev/null 2>&1; then
  if [ -f "runs/latest/out/audit.jsonl" ]; then
    VIOLATIONS=$(grep -c "CONSTRAINT_VIOLATION" runs/latest/out/audit.jsonl || echo "0")
    INJECTIONS=$(grep -c "INJECTION_DETECTED" runs/latest/out/audit.jsonl || echo "0")
    
    if [ "$VIOLATIONS" = "0" ]; then
      echo "  ✅ Security passed - 0 violations, $INJECTIONS injection attempts detected"
    else
      echo "  ❌ Security failed - $VIOLATIONS violations detected"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  ⚠️  No audit log (security logging may not be enabled)"
  fi
else
  echo "  ❌ Scenario failed"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 3: Quick deal scenario
echo "Test 3: Quick deal (iphone_quick_deal)"
TOTAL=$((TOTAL + 1))
if make scenario SCENARIO=iphone_quick_deal DURATION_SEC=90 >/dev/null 2>&1; then
  if [ -f "runs/latest/out/summary.json" ]; then
    DEAL=$(cat runs/latest/out/summary.json | grep -o '"dealReached":[^,]*' | cut -d: -f2)
    echo "  ✅ Completed - Deal: $DEAL"
  else
    echo "  ❌ No summary generated"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ❌ Scenario failed"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "=========================="
echo "Validation Results:"
echo "  Total tests: $TOTAL"
echo "  Passed: $((TOTAL - ERRORS))"
echo "  Failed: $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ All validation tests passed!"
  exit 0
else
  echo "❌ $ERRORS tests failed"
  exit 1
fi
