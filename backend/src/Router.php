<?php

declare(strict_types=1);

namespace PdfDesk;

use PdfDesk\Http\Request;
use PdfDesk\Http\Response;

final class Router
{
    /** @var array<string, callable(Request): Response> */
    private array $routes = [];

    /** @param callable(Request): Response $handler */
    public function get(string $path, callable $handler): void
    {
        $this->routes['GET ' . $path] = $handler;
    }

    /** @param callable(Request): Response $handler */
    public function post(string $path, callable $handler): void
    {
        $this->routes['POST ' . $path] = $handler;
    }

    public function dispatch(Request $request): Response
    {
        $key = $request->method . ' ' . $request->path;
        $handler = $this->routes[$key] ?? null;

        if ($handler === null) {
            return Response::json(['error' => 'not_found'], 404);
        }

        try {
            return $handler($request);
        } catch (\Throwable $e) {
            error_log('[pdfdesk] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return Response::json(['error' => 'internal_error'], 500);
        }
    }
}