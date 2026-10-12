# PDFDesk

A self-hosted, browser-first PDF toolkit. Every document action happens in
the browser; the PHP backend exists only to serve runtime configuration and
a health check.

## What it does

Merge, split, reorder, rotate, delete pages; convert images to PDF and PDF to
images; add text watermarks and page numbers. Branding and limits are set in
`backend/config/app.php`.

## Requirements

- **Server:** PHP 8.3+ with the `json` and `mbstring` extensions. Shared hosting
  is fine; no Composer, no database.
- **Developer machine:** Node.js 22.23.3 LTS (via nvm; see `.nvmrc`).

## Development

    # Terminal 1: PHP backend
    php -S 127.0.0.1:8080 -t backend/public

    # Terminal 2: Vite dev server
    cd frontend
    nvm use
    npm ci
    npm run dev

Open http://127.0.0.1:5173/.

## Tests

    cd frontend
    npm run test           # unit tests (Vitest)
    npx playwright test    # end-to-end tests (Playwright)

    cd ..
    php backend/tests/run.php

## Release

See `docs/INSTALLATION.md` for buyer-facing setup and `docs/CONFIGURATION.md`
for every configuration key.
