<?php
/**
 * Lumin Consultancy - Global Environment & Runtime Configuration
 *
 * Dynamically parses environment variables from:
 * 1. Process environment (Docker / Railway / Render / Production CLI)
 * 2. Dotenv file (.env in project root, if present)
 * 3. Sensible development defaults
 */

// Singleton configuration cache
global $luminConfigCache;
if ($luminConfigCache !== null) {
    return $luminConfigCache;
}
// Set uniform timezone to Indian Standard Time (Asia/Kolkata, UTC+5:30)
date_default_timezone_set('Asia/Kolkata');

// Support loading a local .env file if present in project root

// -------------------------------------------------------------------
// 1. Lightweight Dotenv Parser (zero external dependencies)
// -------------------------------------------------------------------
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
            $val = trim($val);

            // Strip surrounding quotes if present
            if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                $val = substr($val, 1, -1);
            }

            // Populate process environment if not already defined
            if (getenv($key) === false) {
                putenv("{$key}={$val}");
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
// Database Configuration (Supports MySQL & PostgreSQL)
// -------------------------------------------------------------------
$dbHost   = env('DB_HOST', env('MYSQLHOST', 'dpg-dbiuhk49v7es738kugf0-a'));
$dbPort   = env('DB_PORT', env('MYSQLPORT', '5432'));
$dbName   = env('DB_NAME', env('MYSQLDATABASE', 'lumin_rndj'));
$dbUser   = env('DB_USER', env('MYSQLUSER', 'lumin_rndj_user'));
$dbPass   = env('DB_PASS', env('MYSQLPASSWORD', 'gZJJlO6EDCvXjvcMWPryqCVGgjQHZL4X'));
$dbDriver = env('DB_CONNECTION', '');

// Support full URL format (Render: DATABASE_URL, Railway: MYSQL_URL / DATABASE_URL)
$dbUrl = env('DATABASE_URL', env('MYSQL_URL'));
if (!empty($dbUrl)) {
    $parsed = parse_url($dbUrl);
    if ($parsed) {
        $scheme = $parsed['scheme'] ?? '';
        if (str_starts_with($scheme, 'postgres') || str_starts_with($scheme, 'pgsql')) {
            $dbDriver = 'pgsql';
        } elseif (str_starts_with($scheme, 'mysql')) {
            $dbDriver = 'mysql';
        }
        $dbHost = $parsed['host'] ?? $dbHost;
        $dbPort = (string)($parsed['port'] ?? ($dbDriver === 'pgsql' ? '5432' : '3306'));
        $dbUser = $parsed['user'] ?? $dbUser;
        $dbPass = $parsed['pass'] ?? $dbPass;
        if (!empty($parsed['path'])) {
            $dbName = ltrim($parsed['path'], '/');
        }
    }
}

// Auto-detect driver if not explicitly specified
if (empty($dbDriver)) {
    if ((string)$dbPort === '5432' || str_starts_with((string)$dbHost, 'dpg-') || str_contains((string)$dbHost, 'postgres')) {
        $dbDriver = 'pgsql';
    } else {
        $dbDriver = 'mysql';
    }
}

$luminConfigCache = [
    'app' => [
        'name' => 'Lumin Consultancy',
        'env'  => env('APP_ENV', 'development'),
        'port' => (int)env('PORT', 8080),
    ],
    'db' => [
        'driver'  => $dbDriver,
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
        'secure'   => env('SMTP_SECURE', 'tls'),
        'fromName' => env('SMTP_FROM_NAME', 'Lumin Consultancy Alerts'),
    ],
    'rate_limit' => [
        'max_per_hour' => (int)env('RATE_LIMIT_MAX', 10),
        'window_sec'   => (int)env('RATE_LIMIT_WINDOW', 3600),
    ],
];

return $luminConfigCache;
