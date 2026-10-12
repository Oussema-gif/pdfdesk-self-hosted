<?php

declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';

use PdfDesk\Config;
use PdfDesk\Controllers\HealthController;
use PdfDesk\Http\Request;
use PdfDesk\Http\Response;
use PdfDesk\Router;

$failures = 0;
$assertions = 0;

function check(string $label, bool $condition): void
{
    global $failures, $assertions;
    $assertions++;
    echo ($condition ? "  ok  " : "FAIL  ") . $label . PHP_EOL;
    if (!$condition) {
        $failures++;
    }
}

echo 'Config' . PHP_EOL;
$config = Config::load();
$public = $config->publicSettings();

check('config exposes appName', is_string($public['appName']) && $public['appName'] !== '');
check('config exposes numeric limits', is_int($public['limits']['maxFileSizeMb']));
check('config exposes boolean tool flags', is_bool($public['tools']['merge'] ?? null));
check('config leaks no server path', !str_contains(json_encode($public) ?: '', __DIR__));

echo PHP_EOL . 'Router' . PHP_EOL;
$router = new Router();
$router->get('/api/health', static fn (Request $r): Response => Response::json(['ok' => true]));
$router->get('/api/config', static fn (Request $r): Response => Response::json(['ok' => true]));

check('known route returns 200', $router->dispatch(new Request('GET', '/api/health'))->status === 200);
check('unknown route returns 404', $router->dispatch(new Request('GET', '/api/nope'))->status === 404);
check('wrong method returns 404', $router->dispatch(new Request('POST', '/api/health'))->status === 404);

echo PHP_EOL . 'Health controller' . PHP_EOL;
$router2 = new Router();
$router2->get('/api/health', [new HealthController($config), 'handle']);
$response = $router2->dispatch(new Request('GET', '/api/health'));
$body = json_decode($response->body, true);

check('health response is valid JSON', is_array($body));
check('health reports phpVersion', isset($body['phpVersion']));
check('health status is ok or degraded', in_array($body['status'] ?? null, ['ok', 'degraded'], true));

echo PHP_EOL . 'Path normalization' . PHP_EOL;
$_SERVER['REQUEST_METHOD'] = 'GET';

$_SERVER['REQUEST_URI'] = '/pdfdesk/api/health';
check('subdirectory install', Request::fromGlobals()->path === '/api/health');

$_SERVER['REQUEST_URI'] = '/api/health/';
check('trailing slash', Request::fromGlobals()->path === '/api/health');

$_SERVER['REQUEST_URI'] = '/api/health?verbose=1';
check('query string', Request::fromGlobals()->path === '/api/health');

$_SERVER['REQUEST_URI'] = '/pdfdesk/';
check('non-api path is left alone', Request::fromGlobals()->path === '/pdfdesk/');

echo PHP_EOL;
echo "$assertions assertions, $failures failures" . PHP_EOL;
exit($failures === 0 ? 0 : 1);