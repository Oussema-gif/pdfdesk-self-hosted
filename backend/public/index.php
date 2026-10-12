<?php

declare(strict_types=1);

use PdfDesk\Config;
use PdfDesk\Controllers\ConfigController;
use PdfDesk\Controllers\HealthController;
use PdfDesk\Http\Request;
use PdfDesk\Http\Response;
use PdfDesk\Router;
use PdfDesk\Security\Headers;

require __DIR__ . '/../src/bootstrap.php';

Headers::apply();

$config = Config::load();
$router = new Router();

$router->get('/api/health', [new HealthController($config), 'handle']);
$router->get('/api/config', [new ConfigController($config), 'handle']);

// Reserved for a future server-side pipeline. Not implemented in v1.
$router->post('/api/process/merge', static fn (Request $r): Response => Response::json(
    ['error' => 'not_implemented'],
    501,
));

$request = Request::fromGlobals();
$router->dispatch($request)->send();