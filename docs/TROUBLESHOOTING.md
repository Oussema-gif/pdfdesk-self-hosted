# Troubleshooting

## The page is blank

1. Open the browser console and the Network tab.
2. Look for a failed request to `./assets/...`. If assets are 404, the
   `pdfdesk-app/` directory was uploaded incompletely. Re-upload it whole.
3. If the console reports a Content-Security-Policy violation, check that
   `.htaccess` (Apache) or the nginx snippet (see INSTALLATION.md) is in place.

## `/api/health` returns 404

Two things to check:

1. Is `api/index.php` present in the upload?
2. Is `mod_rewrite` enabled? On Apache, `AllowOverride` must permit
   `.htaccess` files. Contact your host if it doesn't.

If you are on nginx, the location block in INSTALLATION.md is required.
The `.htaccess` is Apache-only.

## `/api/health` returns `"status":"degraded"`

The response includes `"extensions": {"json": …, "mbstring": …}`. Enable
whichever is `false`:

- Debian/Ubuntu: `sudo apt install php-mbstring` (json is usually built in).
- Fedora/RHEL: `sudo dnf install php-mbstring`.
- Shared hosting: enable the extension from the control panel.

## The app renders but `/api/config` never returns

The frontend falls back to built-in defaults when `/api/config` is unreachable,
so the page continues to work — with `PDFDesk` and `#4f46e5` regardless of what
`app.php` says. Fix the API path to pick up your config. See the previous entry.

## Subdirectory install: thumbnails don't render

Confirm the built assets use relative paths. In `dist/index.html`:

    src="./assets/index-....js"     ← correct
    src="/assets/index-....js"      ← wrong

The build is configured with `base: './'`, so this should be correct out of
the box. If it isn't, the ZIP was assembled by an unrelated build. Re-run
`scripts/build.sh` and repackage.

## A large PDF fails to load

Two limits apply, both from `app.php`:

- `limits.max_file_size_mb` rejects the file before it is read.
- `limits.max_pages` rejects it after a quick header parse.

Raise whichever is blocking, or ask the user to split the file first.

## An "encrypted PDF" error appears for a normal-looking file

The PDF is password-protected (owner password, not user password). PDFDesk
cannot read it in v1. Ask the sender for a non-encrypted copy, or remove the
password with a desktop tool and retry.

## Toasts appear but the workspace stays empty

Check the toast text. If it says "is not a PDF", the file's content doesn't
start with `%PDF-`. Renaming a JPG to `.pdf` won't work; the magic bytes are
checked.

If it says "could not be read", the file is damaged.

## Browser support

Modern Chrome, Firefox, Safari, and Edge. Web Workers, OffscreenCanvas, and
`crypto.randomUUID` are used; the last one falls back to a PRNG when absent.

## Report an issue

Include: the app version (footer), the browser and version, and the exact
toast or console message.
