#!/usr/bin/env bash
set -euo pipefail
DIST="frontend/dist"
if [[ ! -d "$DIST" ]]; then
  echo "ERROR: $DIST not found. Run \`npm run build\` in frontend/ first." >&2
  exit 1
fi
echo "== source maps =="
if find "$DIST" -name '*.map' | grep -q .; then
  echo "FAIL: source maps present"; find "$DIST" -name '*.map'; exit 1
fi
echo "none"
echo "== console.log in app bundle =="
if grep -o "console\\.log" "$DIST"/assets/index-*.js 2>/dev/null | grep -q .; then
  echo "FAIL: console.log found in app bundle"; grep -l "console\\.log" "$DIST"/assets/index-*.js; exit 1
fi
echo "clean"
echo "== relative asset paths =="
if ! grep -q 'src="./assets/' "$DIST/index.html"; then
  echo "FAIL: dist/index.html does not reference ./assets/ relatively"
  grep -o 'src="[^"]*"' "$DIST/index.html"; exit 1
fi
echo "relative"
echo
echo "All bundle checks passed."
