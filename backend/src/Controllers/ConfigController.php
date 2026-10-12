<?php

declare(strict_types=1);

namespace PdfDesk\Controllers;

use PdfDesk\Config;
use PdfDesk\Http\Request;
use PdfDesk\Http\Response;

final class ConfigController
{
    public function __construct(private readonly Config $config) {}

    public function handle(Request $request): Response
    {
        return Response::json($this->config->publicSettings());
    }
}