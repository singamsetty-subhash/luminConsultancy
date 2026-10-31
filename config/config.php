<?php
/**
 * Lumin Consultancy Web Portal & Laboratory Management Platform
 * Central Configuration
 *
 * Replaces Spring Boot application.properties with unified PHP environment settings.
 */

// Global configuration cache to avoid re-parsing on multiple require calls
global $luminConfigCache;
if (isset($luminConfigCache) && is_array($luminConfigCache)) {
    return $luminConfigCache;
}

// Set uniform timezone to Indian Standard Time (Asia/Kolkata, UTC+5:30)
date_default_timezone_set('Asia/Kolkata');

// Support loading a local .env file if present in project root
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile) && is_readable($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            [$key, $val] = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

/**
 * Helper to fetch environment variable with fallback
 */
if (!function_exists('env')) {
    function env(string $key, mixed $default = null): mixed {
        $val = getenv($key);
        if ($val === false) {
            $val = $_ENV[$key] ?? $_SERVER[$key] ?? $default;
        }
        return $val;
    }
}

// -------------------------------------------------------------------
// Database Configuration (MySQL)
// -------------------------------------------------------------------
$dbHost = env('MYSQLHOST', env('DB_HOST', 'localhost'));
$dbPort = env('MYSQLPORT', env('DB_PORT', '3306'));
$dbName = env('MYSQLDATABASE', env('DB_NAME', 'lumindb'));
$dbUser = env('MYSQLUSER', env('DB_USER', 'root'));
$dbPass = env('MYSQLPASSWORD', env('DB_PASS', 'root'));

// Support full URL format (e.g. Railway: mysql://root:pass@host:port/dbname)
$mysqlUrl = env('MYSQL_URL');
if (!empty($mysqlUrl)) {
    $parsed = parse_url($mysqlUrl);
    if ($parsed) {
        $dbHost = $parsed['host'] ?? $dbHost;
        $dbPort = (string)($parsed['port'] ?? $dbPort);
        $dbUser = $parsed['user'] ?? $dbUser;
        $dbPass = $parsed['pass'] ?? $dbPass;
        if (!empty($parsed['path'])) {
            $dbName = ltrim($parsed['path'], '/');
        }
    }
}

$luminConfigCache = [
    'app' => [
        'name' => 'Lumin Consultancy',
        'env'  => env('APP_ENV', 'development'),
        'port' => (int)env('PORT', 8080),
    ],
    'db' => [
        'host'    => $dbHost,
        'port'    => (int)$dbPort,
        'dbname'  => $dbName,
        'user'    => $dbUser,
        'pass'    => $dbPass,
        'charset' => 'utf8mb4',
    ],
    'mail' => [
        'to'       => env('ENQUIRY_TO', 'ceo.lumin@gmail.com'),
        'host'     => env('SMTP_HOST', 'smtp.gmail.com'),
        'port'     => (int)env('SMTP_PORT', 587),
        'username' => env('SMTP_USER', ''),
        'password' => env('SMTP_PASS', ''),
        'secure'   => env('SMTP_SECURE', 'tls'), // 'tls' or 'ssl'
        'timeout'  => 8,
    ],
    'rate_limit' => [
        'max_per_hour' => 5,
        'window_sec'   => 3600,
    ],
];

return $luminConfigCache;
