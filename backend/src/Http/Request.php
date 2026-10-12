<?php

declare(strict_types=1);

namespace PdfDesk\Http;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
    ) {}

    public static function fromGlobals(): self
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            $path = '/';
        }

        // Only normalize paths that belong to the API surface. Everything
        // else is passed through verbatim so static files served by the
        // webserver never reach this router.
        $pos = strpos($path, '/api/');
        if ($pos !== false) {
            $path = substr($path, $pos);
            if ($path !== '/' && str_ends_with($path, '/')) {
                $path = rtrim($path, '/');
            }
        }

        return new self($method, $path);
    }
}