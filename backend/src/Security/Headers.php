<?php

declare(strict_types=1);

namespace PdfDesk\Security;

final class Headers
{
    public static function apply(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('X-Frame-Options: DENY');
        header(
            "Content-Security-Policy: "
            . "default-src 'self'; "
            . "base-uri 'self'; "
            . "form-action 'self'; "
            . "frame-ancestors 'none'; "
            . "img-src 'self' data: blob:; "
            . "style-src 'self' 'unsafe-inline'; "
            . "script-src 'self' 'wasm-unsafe-eval'; "
            . "worker-src 'self' blob:; "
            . "font-src 'self'; "
            . "connect-src 'self'"
        );
    }
}