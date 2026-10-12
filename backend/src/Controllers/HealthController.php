<?php

declare(strict_types=1);

namespace PdfDesk\Controllers;

use PdfDesk\Config;
use PdfDesk\Http\Request;
use PdfDesk\Http\Response;

final class HealthController
{
    public function __construct(private readonly Config $config) {}

    public function handle(Request $request): Response
    {
        $checks = $this->config->healthChecks();
        $extensionsOk = !in_array(false, $checks['extensions'], true);
        $ok = $checks['configReadable'] && $extensionsOk;

        return Response::json(
            [
                'status' => $ok ? 'ok' : 'degraded',
                'phpVersion' => PHP_VERSION,
                'time' => gmdate('c'),
                'checks' => $checks,
            ],
            $ok ? 200 : 503,
        );
    }
}