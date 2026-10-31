<?php
/**
 * Lumin Consultancy - Built-in PHP Development Server Router
 * Usage: php -S localhost:8080 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $uri;

// 1. Route API requests directly to the API router
if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/api/index.php';
    exit;
}

// 2. Route root URL to index.html
if ($uri === '/' || $uri === '') {
    $index = __DIR__ . '/index.html';
    if (file_exists($index)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($index);
        exit;
    }
}

// 3. Serve existing static files directly
if ($uri !== '/' && file_exists($file) && is_file($file)) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mimes = [
        'html' => 'text/html; charset=UTF-8',
        'htm'  => 'text/html; charset=UTF-8',
        'css'  => 'text/css; charset=UTF-8',
        'js'   => 'application/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'txt'  => 'text/plain; charset=UTF-8',
        'pdf'  => 'application/pdf',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        'ttf'  => 'font/ttf',
    ];

    if (isset($mimes[$ext])) {
        header("Content-Type: {$mimes[$ext]}");
    }
    readfile($file);
    exit;
}

// 4. Fallback to custom 404 page for missing routes
http_response_code(404);
$notFoundPage = __DIR__ . '/error/404.html';
if (file_exists($notFoundPage)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($notFoundPage);
    exit;
}

echo "404 Not Found";
