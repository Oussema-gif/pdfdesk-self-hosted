<?php

declare(strict_types=1);

namespace PdfDesk;

final class Config
{
    /** @param array<string, mixed> $data */
    private function __construct(private readonly array $data) {}

    public static function load(): self
    {
        $app = __DIR__ . '/../config/app.php';
        $example = __DIR__ . '/../config/app.example.php';

        if (is_file($app)) {
            $data = require $app;
        } elseif (is_file($example)) {
            $data = require $example;
        } else {
            throw new \RuntimeException('No config file found (config/app.php or config/app.example.php).');
        }

        if (!is_array($data)) {
            throw new \RuntimeException('Config file must return an array.');
        }

        return new self($data);
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->data[$key] ?? $default;
    }

    /** @return array<string, mixed> */
    public function publicSettings(): array
    {
        /** @var array<string, mixed> $limits */
        $limits = (array) $this->get('limits', []);
        /** @var array<string, mixed> $tools */
        $tools = (array) $this->get('tools', []);

        $toolFlags = [];
        foreach ($tools as $key => $value) {
            $toolFlags[(string) $key] = (bool) $value;
        }

        return [
            'appName' => (string) $this->get('app_name', 'PDFDesk'),
            'accentColor' => (string) $this->get('accent_color', '#4f46e5'),
            'limits' => [
                'maxFileSizeMb' => (int) ($limits['max_file_size_mb'] ?? 100),
                'maxPages' => (int) ($limits['max_pages'] ?? 2000),
            ],
            'tools' => $toolFlags,
        ];
    }

    /** @return array{configReadable: bool, extensions: array<string, bool>} */
    public function healthChecks(): array
    {
        return [
            'configReadable' => is_readable(__DIR__ . '/../config/app.example.php'),
            'extensions' => [
                'json' => extension_loaded('json'),
                'mbstring' => extension_loaded('mbstring'),
            ],
        ];
    }
}