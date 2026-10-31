<?php
/**
 * Lumin Consultancy - Unified API Front Controller / Router
 * Handles all requests matching /api/*
 */

// Global headers
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize path: strip trailing slash and base folder prefix if present
$path = preg_replace('#^.*?/api#', '/api', $uri);
$path = rtrim($path, '/');

// Match endpoints:
if ($path === '/api/contact') {
    require __DIR__ . '/contact.php';
    exit;
}

if ($path === '/api/enquiry') {
    require __DIR__ . '/enquiry.php';
    exit;
}

if ($path === '/api/enquiries') {
    require __DIR__ . '/enquiries.php';
    exit;
}

// Match /api/enquiries/{id}
if (preg_match('#^/api/enquiries/(\d+)$#', $path, $matches)) {
    $GLOBALS['routeId'] = (int)$matches[1];
    require __DIR__ . '/enquiries.php';
    exit;
}

// Fallback for unrecognized API routes
http_response_code(404);
echo json_encode([
    'success' => false,
    'error'   => "API endpoint '{$path}' not found"
]);
