# Configuration

All runtime configuration lives in `api/config/app.php`. The file must return
a PHP array. Anything missing falls back to a safe default.

## Getting started

    cd api/config
    cp app.example.php app.php

`app.php` is git-ignored and is not shipped in the release ZIP; the example is.
The `app.php` file is the buyer's; upgrades overwrite only `app.example.php`.

## Keys

### `app_name`

- Type: string
- Default: `"PDFDesk"`
- Shown in the top-left of the header and in the browser tab.

### `accent_color`

- Type: string, `#rrggbb`
- Default: `"#4f46e5"`
- Applied at runtime to `--color-accent` (as an RGB triplet). Buttons, focus
  rings, and tool icons all follow. Invalid values are ignored.

### `limits.max_file_size_mb`

- Type: integer, > 0
- Default: `100`
- Per-file cap enforced in the browser before a file is read. Files above the
  cap are rejected with a toast. No bytes ever reach the server.

### `limits.max_pages`

- Type: integer, > 0
- Default: `2000`
- Page cap enforced when a PDF is loaded. Exceeding it aborts the load of that
  file with a toast. Other files in the same batch are unaffected.

### `tools.<id>`

Enable or disable individual tools. Disabled tools disappear from the home
picker and their route shows "not available".

    'tools' => [
        'merge'         => true,
        'split'         => true,
        'organize'      => true,
        'image_to_pdf'  => true,
        'pdf_to_image'  => true,
        'watermark'     => true,
        'page_numbers'  => true,
    ],

Unknown tool ids are ignored. Missing ids default to `true`.

## Full example

    <?php

    declare(strict_types=1);

    return [
        'app_name' => 'Acme Docs',
        'accent_color' => '#dc2626',

        'limits' => [
            'max_file_size_mb' => 50,
            'max_pages' => 500,
        ],

        'tools' => [
            'merge' => true,
            'split' => true,
            'organize' => true,
            'image_to_pdf' => true,
            'pdf_to_image' => true,
            'watermark' => false,
            'page_numbers' => true,
        ],
    ];

## API

Two endpoints, both GET, both public:

- `/api/health` — status, PHP version, extension check. Returns `503` with
  `"status":"degraded"` if `json` or `mbstring` is missing.
- `/api/config` — a curated subset of `app.php`. **Never** includes server
  paths, secrets, or the raw file.

`POST /api/process/*` is reserved for a future server-side pipeline and returns
`501 Not Implemented` today. Nothing in the current frontend calls it.

## Sanity check

If a config edit isn't picked up, the most common cause is editing
`app.example.php` instead of `app.php`. `app.php` is the one that wins.
