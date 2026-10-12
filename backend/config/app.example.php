<?php

declare(strict_types=1);

/*
 * PDFDesk configuration.
 *
 * Copy this file to app.php and edit the copy:
 *     cp config/app.example.php config/app.php
 *
 * config/app.php is git-ignored and is not shipped inside the release ZIP.
 */

return [
    'app_name' => 'PDFDesk',
    'accent_color' => '#4f46e5',

    'limits' => [
        'max_file_size_mb' => 100,
        'max_pages' => 2000,
    ],

    'tools' => [
        'merge' => true,
        'split' => true,
        'organize' => true,
        'image_to_pdf' => true,
        'pdf_to_image' => true,
        'watermark' => true,
        'page_numbers' => true,
    ],
];