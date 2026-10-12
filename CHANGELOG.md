# Changelog

All notable changes to PDFDesk are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-12

### Added

- Merge: combine pages from several PDFs, reorder across files, download as `merged.pdf`.
- Organize: reorder, rotate, and delete pages in a shared workspace.
- Split and extract: split by ranges (`1-3, 5, 8-10`) or every N pages, ZIP output for
  multiple parts, and extract only the selected pages.
- Images to PDF: PNG and JPG to PDF with page-size, orientation, and margin controls.
- PDF to images: render selected pages as PNG or JPG at 1x–4x scale; multi-page output
  is delivered as a ZIP.
- Watermark: text watermark with size, opacity, rotation, position, and
  selection-aware application.
- Page numbers: six positions, three formats, start value, and "skip first page".
- Light and dark theme with system detection, persisted preference, and runtime
  accent colour from the backend config.
- Runtime branding and limits served from `config/app.php`: application name,
  accent colour, per-file size cap, total page cap, per-tool enable flags.
- In-browser processing: documents never leave the browser. The PHP backend serves
  only `/api/health` and `/api/config`.
- Encrypted and malformed PDFs are detected and reported with clear messages; one
  bad file does not break the rest of the batch.
- Progress reporting and cancellation for long-running operations.

### Toolchain

- Node.js 22.23.3 LTS.
- Vite 6.4.4, React 18.3.1, TypeScript 5.7.2, Tailwind CSS 3.4.17.
- pdf-lib 1.17.1, PDF.js 4.9.155.
- PHP 8.3+ backend, no framework, no Composer, no database.
