#!/usr/bin/env bash
# Build + gate the frontend, run e2e, regenerate license inventory.
# Run from anywhere: bash scripts/build.sh
# Skip e2e:         SKIP_E2E=1 bash scripts/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load nvm if present.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
fi

# Pin Node to whatever .nvmrc says by forcing its bin/ onto PATH. This is
# deterministic and bypasses nvm's "already active" short-circuit, which can
# leave the wrong Node on PATH when the ambient shell and .nvmrc disagree.
if [ -f "$ROOT/.nvmrc" ]; then
  PINNED="$(tr -d '[:space:]' < "$ROOT/.nvmrc")"
  if command -v nvm >/dev/null 2>&1; then
    nvm install "$PINNED" >/dev/null 2>&1 || true
  fi
  NODE_BIN="$NVM_DIR/versions/node/v$PINNED/bin"
  if [ -d "$NODE_BIN" ]; then
    export PATH="$NODE_BIN:$PATH"
    hash -r 2>/dev/null || true
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install nvm and run \`nvm install\` from .nvmrc." >&2
  exit 1
fi

EXPECTED_NODE="$(tr -d '[:space:]' < "$ROOT/.nvmrc" 2>/dev/null || echo '')"
ACTUAL_NODE="$(node -v | sed 's/^v//')"
if [ -n "$EXPECTED_NODE" ] && [ "$EXPECTED_NODE" != "$ACTUAL_NODE" ]; then
  echo "Node version mismatch: .nvmrc says $EXPECTED_NODE, running $ACTUAL_NODE." >&2
  echo "PATH: $PATH" >&2
  exit 1
fi

echo "==> node $(node -v), npm $(npm -v)"

cd "$ROOT/frontend"

echo "==> npm ci"
npm ci

echo "==> lint"
npm run lint

echo "==> typecheck"
npm run typecheck

echo "==> unit tests"
npm run test

echo "==> production build"
npm run build

cd "$ROOT"

echo "==> bundle safety"
bash scripts/check-bundle.sh

echo "==> license inventory"
node scripts/generate-license-report.mjs >/dev/null

if [ "${SKIP_E2E:-0}" != "1" ]; then
  echo "==> e2e"
  ( cd "$ROOT/frontend" && npx playwright test --reporter=list )
fi

echo
echo "Build complete. Frontend artifacts: frontend/dist/"
