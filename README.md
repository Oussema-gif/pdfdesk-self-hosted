# PDFDesk

[![License:
MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/Oussema-gif/pdfdesk-self-hosted/actions/workflows/ci.yml/badge.svg)](https://github.com/Oussema-gif/pdfdesk-self-hosted/actions/workflows/ci.yml)

**A self-hosted PDF toolkit that runs entirely in the browser.**

No uploads, no database, no accounts. Use seven PDF tools and download
the results --- your files stay on your machine.

Built with React and TypeScript on the frontend, with a lightweight PHP
backend. Designed for conventional shared hosting.

------------------------------------------------------------------------

## Why PDFDesk?

Many online PDF tools require uploading documents to a remote server.
For contracts, invoices, and other sensitive documents, that may not be
acceptable.

PDFDesk processes documents locally using `pdf-lib` and PDF.js in the
browser. The PHP backend supplies configuration and health-check
endpoints; it does not process or store uploaded documents.

To verify network activity, open your browser's Developer Tools, select
Network, and use the application. Check requests against the
application's own endpoints and any configured external origins.

## Features

  -----------------------------------------------------------------------
  Tool                                Description
  ----------------------------------- -----------------------------------
  **Merge**                           Combine multiple PDFs into one
                                      document.

  **Organize**                        Reorder, rotate, and delete pages.

  **Split & Extract**                 Split by page ranges or page
                                      intervals and extract selected
                                      pages.

  **Images to PDF**                   Convert PNG and JPG images into PDF
                                      pages with layout options.

  **PDF to Images**                   Export pages as PNG or JPG at
                                      different resolutions.

  **Watermark**                       Add text watermarks with
                                      configurable size, opacity,
                                      rotation, and position.

  **Page Numbers**                    Add page numbers with configurable
                                      positions, formats, and starting
                                      values.
  -----------------------------------------------------------------------

Branding, tool availability, and other supported settings are configured
in `backend/config/app.php`.

## Scope

Version 1.0.0 does not include PDF compression, OCR, Word or Excel
conversion, editing existing PDF text, e-signatures, or form filling.
Encrypted PDFs are not decrypted.

## Technology stack

  Layer               Technologies
  ------------------- ----------------------------------------------------
  Frontend            React 18, TypeScript 5.7, Vite 6, Tailwind CSS 3.4
  PDF processing      pdf-lib, PDF.js
  Page interactions   @dnd-kit
  Backend             PHP 8.3+, no framework, no Composer, no database
  Testing             Vitest, Playwright, PHP CLI test harness

See `docs/VERSIONS.md` for the project's dependency matrix.

## Requirements

**Production server** - PHP 8.3+ - PHP `json` and `mbstring`
extensions - Apache with `mod_rewrite` or appropriately configured nginx

**Development environment** - Node.js 22.23.3 - npm - PHP 8.3+

Node.js is not required on the production server.

## Development

From the repository root, start the PHP development server:

``` bash
php -S 127.0.0.1:8080 -t backend/public
```

In another terminal, start the frontend:

``` bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Tests

Run the frontend checks from the `frontend` directory:

``` bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For end-to-end tests, follow the project's Playwright setup:

``` bash
npx playwright test
```

Run backend tests from the repository root:

``` bash
php backend/tests/run.php
```

If the repository's build script performs additional release checks,
run:

``` bash
bash scripts/build.sh
```

## Build a release ZIP

From the repository root:

``` bash
bash scripts/package-release.sh
```

The script creates a release archive under `dist-release/` when the
project's release checks pass. Review the archive before distribution.

## Documentation

-   Installation
-   Configuration
-   Troubleshooting
-   Dependency versions
-   Third-party licenses

## Privacy

PDF document processing is designed to happen locally in the browser.
The application uses its backend for configuration and health checks.
Review the browser's Network panel and the code before making privacy
guarantees for a deployment.

## License

MIT --- see [LICENSE](LICENSE).

Third-party license information is available in
`docs/THIRD_PARTY_LICENSES.md`.
