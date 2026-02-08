#!/usr/bin/env bash
set -euo pipefail

# Validation script for clawlist-matrix-run installation
# Run this to verify everything is set up correctly

echo "🔍 Validating clawlist-matrix-run installation..."
echo ""

ERRORS=0

# Check Node.js
echo -n "Checking Node.js... "
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node --version)
  echo "✅ $NODE_VERSION"
else
  echo "❌ Node.js not found"
  ERRORS=$((ERRORS + 1))
fi

# Check npm
echo -n "Checking npm... "
if command -v npm >/dev/null 2>&1; then
  NPM_VERSION=$(npm --version)
  echo "✅ v$NPM_VERSION"
else
  echo "❌ npm not found"
  ERRORS=$((ERRORS + 1))
fi

# Check dependencies installed
echo -n "Checking dependencies... "
if [ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]; then
  echo "✅ Installed"
else
  echo "❌ Run: npm install"
  ERRORS=$((ERRORS + 1))
fi

# Check TypeScript build
echo -n "Checking TypeScript build... "
if [ -d "dist" ] && [ -f "dist/run-scenario.js" ]; then
  echo "✅ Built"
else
  echo "⚠️  Run: npm run build"
fi

# Check Docker
echo -n "Checking Docker... "
if command -v docker >/dev/null 2>&1; then
  DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
  echo "✅ $DOCKER_VERSION"
else
  echo "❌ Docker not found (required for Matrix)"
  ERRORS=$((ERRORS + 1))
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_VERSION=$(docker compose version --short)
  echo "✅ $COMPOSE_VERSION"
else
  echo "❌ Docker Compose not found"
  ERRORS=$((ERRORS + 1))
fi

# Check OpenClaw CLI
echo -n "Checking OpenClaw CLI... "
if command -v openclaw >/dev/null 2>&1; then
  OPENCLAW_VERSION=$(openclaw --version 2>&1 | head -1 || echo "unknown")
  echo "✅ $OPENCLAW_VERSION"
else
  echo "❌ OpenClaw not found"
  ERRORS=$((ERRORS + 1))
fi

# Run unit tests
echo ""
echo "Running unit tests..."
if npm test >/dev/null 2>&1; then
  echo "✅ All tests passed (105 tests)"
else
  echo "❌ Tests failed - run: npm test"
  ERRORS=$((ERRORS + 1))
fi

# Validate scenarios
echo ""
echo "Validating scenarios..."
if npm run validate >/dev/null 2>&1; then
  echo "✅ All scenarios valid (7 scenarios)"
else
  echo "❌ Scenario validation failed - run: npm run validate"
  ERRORS=$((ERRORS + 1))
fi

# Check for required files
echo ""
echo "Checking project structure..."
REQUIRED_FILES=(
  "package.json"
  "tsconfig.json"
  "Makefile"
  "README.md"
  "PLAN.md"
  "src/run-scenario.ts"
  "scenarios/switch_basic.json"
  "infra/docker-compose.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ] || [ -d "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ Missing: $file"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
  echo "✅ Validation passed!"
  echo ""
  echo "Quick start:"
  echo "  make up           # Start infrastructure"
  echo "  make bootstrap    # Create users + rooms"
  echo "  make scenario SCENARIO=switch_basic"
  exit 0
else
  echo "❌ Validation failed with $ERRORS errors"
  echo ""
  echo "Fix the issues above and run again."
  exit 1
fi
