<?php
/**
 * Lumin Consultancy - Database Connection & Schema Provisioning
 * Supports PostgreSQL (Render) and MySQL with automated schema provisioning.
 */

class Database {
    private static ?PDO $instance = null;
    private static bool $initialized = false;

    /**
     * Get singleton PDO connection instance
     */
    public static function getConnection(): PDO {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $config = require __DIR__ . '/config.php';
        $db = $config['db'];

        $driver   = $db['driver'] ?? 'pgsql';
        $host     = $db['host'];
        $port     = $db['port'];
        $dbname   = $db['dbname'];
        $user     = $db['user'];
        $pass     = $db['pass'];
        $charset  = $db['charset'] ?? 'utf8mb4';
        $sslmode  = $db['sslmode'] ?? 'prefer';

        $isPgsql = ($driver === 'pgsql') || ($port == 5432) || str_starts_with((string)$host, 'dpg-') || str_contains((string)$host, 'postgres');

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        if (!$isPgsql) {
            $options[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES $charset COLLATE utf8mb4_unicode_ci";
        }

        try {
            if ($isPgsql) {
                // Cloud PostgreSQL (Render / Supabase / Neon / AWS RDS) requires SSL
                if (str_contains((string)$host, 'render.com') || str_starts_with((string)$host, 'dpg-')) {
                    $sslmode = 'require';
                }
                $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode";
            } else {
                $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=$charset";
            }
            self::$instance = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            // MySQL auto-create database if not found (error 1049)
            if (!$isPgsql && ($e->getCode() == 1049 || str_contains($e->getMessage(), 'Unknown database'))) {
                try {
                    $serverDsn = "mysql:host=$host;port=$port;charset=$charset";
                    $serverPdo = new PDO($serverDsn, $user, $pass, $options);
                    $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET $charset COLLATE utf8mb4_unicode_ci");
                    $serverPdo = null;

                    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=$charset";
                    self::$instance = new PDO($dsn, $user, $pass, $options);
                } catch (PDOException $e2) {
                    error_log("Database initialization error: " . $e2->getMessage());
                    throw $e2;
                }
            } else {
                error_log("Database connection failure: " . $e->getMessage());
                throw $e;
            }
        }

        // Auto-provision schema on first connection if tables do not exist
        if (!self::$initialized) {
            self::ensureTablesExist(self::$instance, $isPgsql);
            self::$initialized = true;
        }

        return self::$instance;
    }

    /**
     * Ensures the enquiries and rate_limits tables exist in the database.
     */
    private static function ensureTablesExist(PDO $pdo, bool $isPgsql): void {
        if ($isPgsql) {
            $schemaSql = <<<SQL
            CREATE TABLE IF NOT EXISTS enquiries (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(120) NOT NULL,
                organization VARCHAR(160) NOT NULL,
                designation VARCHAR(120) DEFAULT NULL,
                email VARCHAR(160) NOT NULL,
                phone VARCHAR(40) NOT NULL,
                sector VARCHAR(120) DEFAULT NULL,
                service VARCHAR(120) DEFAULT NULL,
                status VARCHAR(120) DEFAULT NULL,
                message VARCHAR(3000) DEFAULT NULL,
                preferred VARCHAR(40) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries (created_at DESC);

            CREATE TABLE IF NOT EXISTS rate_limits (
                ip VARCHAR(45) NOT NULL,
                hit_time BIGINT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_hit ON rate_limits (ip, hit_time);
SQL;
        } else {
            $schemaSql = <<<SQL
            CREATE TABLE IF NOT EXISTS `enquiries` (
                `id` BIGINT NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(120) NOT NULL,
                `organization` VARCHAR(160) NOT NULL,
                `designation` VARCHAR(120) DEFAULT NULL,
                `email` VARCHAR(160) NOT NULL,
                `phone` VARCHAR(40) NOT NULL,
                `sector` VARCHAR(120) DEFAULT NULL,
                `service` VARCHAR(120) DEFAULT NULL,
                `status` VARCHAR(120) DEFAULT NULL,
                `message` VARCHAR(3000) DEFAULT NULL,
                `preferred` VARCHAR(40) DEFAULT NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_created_at` (`created_at` DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `rate_limits` (
                `ip` VARCHAR(45) NOT NULL,
                `hit_time` BIGINT NOT NULL,
                INDEX `idx_ip_hit` (`ip`, `hit_time`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL;
        }

        try {
            $pdo->exec($schemaSql);
        } catch (PDOException $e) {
            error_log("Error ensuring database tables exist: " . $e->getMessage());
        }
    }
}
