# Installation

PDFDesk is a static frontend plus a tiny PHP backend. Installation is a file
upload; there is no database, no Composer, and no Node.js runtime on the
server.

## Requirements

- **PHP 8.3 or newer** with the `json` and `mbstring` extensions enabled.
- Apache with `mod_rewrite` (shared hosting is fine) **or** nginx with an
  equivalent location block. An Apache `.htaccess` is included.
- HTTPS is recommended but not required.

Check the PHP version and extensions:

    php -v
    php -m | grep -E 'json|mbstring'

## Upload steps

1. Unzip `pdfdesk-v1.0.0.zip`.
2. Upload the **contents of `pdfdesk-app/`** to the target directory on the
   server. For a site root install, that is `public_html/` or `htdocs/`.
   For a subdirectory install, use e.g. `public_html/pdfdesk/`.
3. Make a copy of the example configuration:

       cp api/config/app.example.php api/config/app.php

   Edit `api/config/app.php` if you want to change the app name, accent
   colour, file-size limit, page limit, or which tools are enabled.
4. Visit the site. The home page should render and the health check should
   answer:

       https://your-domain.example/api/health

   Expected response: `{"status":"ok", "phpVersion":"8.3.x", ...}`.

That's it. No build step.

## Subdirectory installs

The bundled frontend uses relative asset paths (`./assets/...`) and `HashRouter`
for routing, so installing under a subdirectory works without any rewrite
configuration beyond the `.htaccess` already provided. Verify by opening:

    https://your-domain.example/pdfdesk/

and confirming that thumbnails render after dropping a PDF.

## Apache

The `.htaccess` at the app root does three things:

- Routes `/api/*` to `api/index.php`.
- Serves static files normally.
- Blocks direct access to `api/src/` and `api/config/`.

`mod_rewrite` and `mod_headers` must be enabled (they are on virtually every
shared host; ask support if they aren't).

## nginx

If your host uses nginx, add this location block to the server's site
configuration, adjusting the `root` path:

    location /pdfdesk/ {
        root /var/www;
        try_files $uri $uri/ /pdfdesk/api/index.php?$query_string;
    }

    location ~ ^/pdfdesk/api/src/ {
        deny all;
    }

    location ~ ^/pdfdesk/api/config/ {
        deny all;
    }

## PHP settings

Because the frontend does all PDF work in the browser, no PDF bytes reach the
server. PHP's `upload_max_filesize` and `post_max_size` are therefore
irrelevant. If your host overrides `display_errors`, that is fine — the API
returns JSON errors and never exposes stack traces.

## Permissions

The app writes nothing to disk. `api/config/` may remain read-only.

## Uninstall

Delete the directory. There is nothing to clean up elsewhere.

## Quick start (5 minutes)

1. Upload `pdfdesk-app/` to a subdirectory.
2. Copy `api/config/app.example.php` to `api/config/app.php`.
3. Open the site.
4. Drop a PDF onto the home page, pick a tool, download the result.
