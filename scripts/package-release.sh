#!/usr/bin/env bash
# Assemble the Codester release ZIP from a clean build.
# Run from anywhere: bash scripts/package-release.sh
# Skips e2e by default; set RUN_E2E=1 to include it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./frontend/package.json').version")"
STAGE="$ROOT/dist-release"
BUNDLE="pdfdesk-v${VERSION}"
APP_NAME="pdfdesk-app"

# Refuse to run on uncommitted changes unless ALLOW_DIRTY=1.
if [ "${ALLOW_DIRTY:-0}" != "1" ] && [ -d "$ROOT/.git" ]; then
  if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
    echo "Refusing: git working tree is dirty. Commit or set ALLOW_DIRTY=1." >&2
    exit 1
  fi
fi

echo "==> building"
if [ "${RUN_E2E:-0}" = "1" ]; then
  bash "$ROOT/scripts/build.sh"
else
  SKIP_E2E=1 bash "$ROOT/scripts/build.sh"
fi

echo "==> assembling $BUNDLE"
rm -rf "$STAGE"
mkdir -p "$STAGE/$BUNDLE"

# --- pdfdesk-app/ ------------------------------------------------------------
APP="$STAGE/$BUNDLE/$APP_NAME"
mkdir -p "$APP/api/config" "$APP/api/src"

cp -R "$ROOT/frontend/dist/." "$APP/"

# Backend entry point at api/index.php with the correct require path.
cat > "$APP/api/index.php" <<'PHP'
<?php

declare(strict_types=1);

use PdfDesk\Config;
use PdfDesk\Controllers\ConfigController;
use PdfDesk\Controllers\HealthController;
use PdfDesk\Http\Request;
use PdfDesk\Http\Response;
use PdfDesk\Router;
use PdfDesk\Security\Headers;

require __DIR__ . '/src/bootstrap.php';

Headers::apply();

$config = Config::load();
$router = new Router();

$router->get('/api/health', [new HealthController($config), 'handle']);
$router->get('/api/config', [new ConfigController($config), 'handle']);

// Reserved for a future server-side pipeline. Not implemented in v1.
$router->post('/api/process/merge', static fn (Request $r): Response => Response::json(
    ['error' => 'not_implemented'],
    501,
));

$request = Request::fromGlobals();
$router->dispatch($request)->send();
PHP

cp -R "$ROOT/backend/src/." "$APP/api/src/"
cp "$ROOT/backend/config/app.example.php" "$APP/api/config/app.example.php"

# Block HTTP access to api/config/ and api/src/ on any host, subdirectory-safe.
echo "Require all denied" > "$APP/api/config/.htaccess"
echo "Require all denied" > "$APP/api/src/.htaccess"

# Rewrite /api/* and set security headers.
cat > "$APP/.htaccess" <<'APACHE'
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Route /api/* requests that don't match a real file to api/index.php.
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^api/ api/index.php [L]
</IfModule>

<IfModule mod_headers.c>
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set X-Frame-Options "DENY"
</IfModule>
APACHE

# --- source/ ----------------------------------------------------------------
SRC="$STAGE/$BUNDLE/source"
mkdir -p "$SRC"

copy_tree() {
    local from="$1" to="$2"
    if [ ! -d "$from" ]; then return 0; fi
    mkdir -p "$to"
    ( cd "$from" && find . -mindepth 1 -maxdepth 1 -exec cp -R {} "$to/" \; )
    find "$to" -type d -name node_modules   -prune -exec rm -rf {} +
    find "$to" -type d -name dist           -prune -exec rm -rf {} +
    find "$to" -type d -name dist-release   -prune -exec rm -rf {} +
    find "$to" -type d -name test-results   -prune -exec rm -rf {} +
    find "$to" -type d -name coverage       -prune -exec rm -rf {} +
    find "$to" -type d -name .vite          -prune -exec rm -rf {} +
    find "$to" -type d -name playwright-report -prune -exec rm -rf {} +
    find "$to" -type f \( -name '.env' -o -name '.env.*' -o -name '*.log' -o -name '*.map' \) -delete
}

copy_tree "$ROOT/frontend"  "$SRC/frontend"
copy_tree "$ROOT/backend"   "$SRC/backend"
copy_tree "$ROOT/scripts"   "$SRC/scripts"
copy_tree "$ROOT/tests"     "$SRC/tests"

# Source keeps a copy of docs too, so someone reading source/ has everything.
copy_tree "$ROOT/docs"      "$SRC/docs"
cp "$ROOT/README.md"        "$SRC/README.md"

# --- top-level extras -------------------------------------------------------
cp -R "$ROOT/docs"           "$STAGE/$BUNDLE/docs"
cp "$ROOT/LICENSE"           "$STAGE/$BUNDLE/LICENSE"
cp "$ROOT/CHANGELOG.md"      "$STAGE/$BUNDLE/CHANGELOG.md"

# --- sanity checks ----------------------------------------------------------
echo "==> sanity checks"
fail() { echo "FAIL: $1" >&2; exit 1; }

find "$STAGE/$BUNDLE" -name node_modules -type d | grep -q . && fail "node_modules in bundle"
find "$STAGE/$BUNDLE" -name '*.map'             | grep -q . && fail "source maps in bundle"
find "$STAGE/$BUNDLE" \( -name '.env' -o -name '.env.*' \) | grep -q . && fail ".env in bundle"
find "$STAGE/$BUNDLE" -name 'app.php' -path '*api/config/*' | grep -q . && fail "app.php present (ship app.example.php only)"
find "$STAGE/$BUNDLE" -name 'playwright-report' -type d | grep -q . && fail "playwright-report in bundle"
find "$STAGE/$BUNDLE" -name 'test-results' -type d | grep -q . && fail "test-results in bundle"

for required in \
  "$APP/index.html" \
  "$APP/.htaccess" \
  "$APP/api/index.php" \
  "$APP/api/src/bootstrap.php" \
  "$APP/api/config/app.example.php" \
  "$STAGE/$BUNDLE/LICENSE" \
  "$STAGE/$BUNDLE/CHANGELOG.md" \
  "$STAGE/$BUNDLE/docs/INSTALLATION.md" \
  "$STAGE/$BUNDLE/docs/CONFIGURATION.md" \
  "$STAGE/$BUNDLE/docs/TROUBLESHOOTING.md" \
  "$STAGE/$BUNDLE/docs/THIRD_PARTY_LICENSES.md" \
  "$STAGE/$BUNDLE/docs/VERSIONS.md" \
  "$STAGE/$BUNDLE/source/frontend/package.json" \
  "$STAGE/$BUNDLE/source/backend/public/index.php" \
; do
  [ -e "$required" ] || fail "missing required file: $required"
done

# --- zip --------------------------------------------------------------------
echo "==> zipping"
cd "$STAGE"
if command -v zip >/dev/null 2>&1; then
  rm -f "$BUNDLE.zip"
  zip -rq "$BUNDLE.zip" "$BUNDLE"
else
  python3 - "$BUNDLE" "$BUNDLE.zip" <<'PY'
import os, sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
if os.path.exists(dst): os.remove(dst)
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(src):
        for f in files:
            p = os.path.join(root, f)
            zf.write(p, os.path.relpath(p, '.'))
PY
fi

SIZE="$(du -h "$STAGE/$BUNDLE.zip" | cut -f1)"
echo
echo "Release ready:"
echo "  $STAGE/$BUNDLE.zip  ($SIZE)"
echo
echo "Contents of the bundle root:"
ls -1 "$STAGE/$BUNDLE"
