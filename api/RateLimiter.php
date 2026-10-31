<?php
/**
 * Lumin Consultancy - IP Rate Limiter
 * Implements sliding-window rate limiting.
 * Replicates EnquiryController.tooMany(ip) behavior from Spring Boot,
 * with relaxed limits for local testing/development environments.
 */

class RateLimiter {
    /**
     * Checks if the client IP has exceeded the hourly submission quota.
     * Records the hit if within quota.
     *
     * @param string $ip Client IP address
     * @param PDO|null $pdo Optional PDO connection
     * @return bool True if rate limit is exceeded, false if allowed
     */
    public static function isRateLimited(string $ip, ?PDO $pdo = null): bool {
        $config = require __DIR__ . '/../config/config.php';
        $maxPerHour = (int)($config['rate_limit']['max_per_hour'] ?? 5);
        $windowSec  = (int)($config['rate_limit']['window_sec'] ?? 3600);
        $appEnv     = $config['app']['env'] ?? 'production';

        // Relax limit to 100/hr for localhost or when in development mode so local testing isn't blocked
        $isLocal = in_array($ip, ['127.0.0.1', '::1', 'localhost'], true) || ($appEnv === 'development');
        if ($isLocal) {
            $maxPerHour = max($maxPerHour, 100);
        }

        $now = time();
        $cutoff = $now - $windowSec;

        // Try database rate limiting first if PDO available
        if ($pdo !== null) {
            try {
                // Delete hits older than the cutoff window
                $stmt = $pdo->prepare("DELETE FROM `rate_limits` WHERE `hit_time` < :cutoff");
                $stmt->execute([':cutoff' => $cutoff]);

                // Count recent hits within window for this IP
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM `rate_limits` WHERE `ip` = :ip AND `hit_time` >= :cutoff");
                $stmt->execute([':ip' => $ip, ':cutoff' => $cutoff]);
                $count = (int)$stmt->fetchColumn();

                if ($count >= $maxPerHour) {
                    return true;
                }

                // Record current hit
                $stmt = $pdo->prepare("INSERT INTO `rate_limits` (`ip`, `hit_time`) VALUES (:ip, :hit_time)");
                $stmt->execute([':ip' => $ip, ':hit_time' => $now]);
                return false;
            } catch (Throwable $e) {
                error_log("DB RateLimiter error, falling back to file cache: " . $e->getMessage());
            }
        }

        // Fallback: File-based sliding-window rate limiting in sys temp dir
        $hash = md5($ip);
        $file = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'lumin_rate_' . $hash . '.json';
        $hits = [];

        if (file_exists($file)) {
            $raw = @file_get_contents($file);
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) {
                $hits = array_filter($parsed, fn($t) => is_numeric($t) && $t >= $cutoff);
            }
        }

        if (count($hits) >= $maxPerHour) {
            return true;
        }

        $hits[] = $now;
        @file_put_contents($file, json_encode(array_values($hits)));
        return false;
    }

    /**
     * Clears all recorded rate limit hits (useful for testing)
     */
    public static function reset(?PDO $pdo = null): void {
        if ($pdo !== null) {
            try {
                $pdo->exec("DELETE FROM `rate_limits`");
            } catch (Throwable $e) {
                error_log("Failed to clear DB rate limits: " . $e->getMessage());
            }
        }
        foreach (glob(sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'lumin_rate_*.json') as $f) {
            @unlink($f);
        }
    }

    /**
     * Retrieves client IP address considering proxy headers
     */
    public static function getClientIp(): string {
        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
}
