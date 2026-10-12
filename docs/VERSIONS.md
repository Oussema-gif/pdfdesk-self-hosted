# Locked versions

Exact pins. `package-lock.json` is committed; rebuilds are reproducible.

## Runtime — shipped to the browser

| Package | Pin | License |
|---|---|---|
| react | 18.3.1 | MIT |
| react-dom | 18.3.1 | MIT |
| react-router-dom | 7.18.4 | MIT |
| pdfjs-dist | 4.9.155 | Apache-2.0 |
| pdf-lib | 1.17.1 | MIT |
| @dnd-kit/core | 6.3.1 | MIT |
| @dnd-kit/sortable | 10.0.0 | MIT |
| @dnd-kit/utilities | 3.2.2 | MIT |
| fflate | 0.8.3 | MIT |
| lucide-react | 0.468.0 | ISC |

## Toolchain — dev only, never shipped

| Package | Pin |
|---|---|
| node | 22.23.3 LTS (Jod) |
| vite | 6.4.4 |
| typescript | 5.7.2 |
| tailwindcss | 3.4.17 |
| postcss | 8.5.29 |
| eslint | 9.39.5 |
| typescript-eslint | 8.71.1 |
| vitest | 4.1.11 |
| @playwright/test | 1.49.1 |

## Server

| Tool | Version |
|---|---|
| PHP | 8.3+ (8.5.11 in development) |
| Extensions | `json`, `mbstring` |

## Deferred bumps

Recorded here, not silently ignored.

### Tailwind 3 → 4

Dev-only advisories in the `braces` / `micromatch` / `fast-glob` /
`postcss-selector-parser` chain. All triggered on **build-time, developer-authored**
CSS; nothing user-supplied reaches them. Fix requires Tailwind 4's
CSS-config migration (JS config → CSS config, plugin API changes).
Deferred. The audit is not "clean" but it is "irrelevant to shipped code".

### eslint 9 → 10

Deprecation notice, dev-only, flat-config schema changes.
Deferred.

### `whatwg-encoding`

Transitive through `jsdom`, dev-only. Deprecated upstream; no vulnerability
advisory applies. Deferred.

## Audit policy

`npm audit` must show **zero critical or high in prod scope** before each
release. Dev-scope advisories are triaged case by case and recorded above.
Never run `npm audit fix --force`.
