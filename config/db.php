<?php
/**
 * Lumin Consultancy - Database Connection & Schema Provisioning
 * Replaces Spring Data JPA / Hibernate DataSource with high-performance PDO.
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

        $host    = $db['host'];
        $port    = $db['port'];
        $dbname  = $db['dbname'];
        $user    = $db['user'];
        $pass    = $db['pass'];
        $charset = $db['charset'];

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES $charset COLLATE utf8mb4_unicode_ci",
        ];

        try {
            // First attempt direct connection to the target database
            $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=$charset";
            self::$instance = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            // If database does not exist (error 1049), auto-create it (replicates createDatabaseIfNotExist=true)
            if ($e->getCode() == 1049 || str_contains($e->getMessage(), 'Unknown database')) {
                try {
                    $serverDsn = "mysql:host=$host;port=$port;charset=$charset";
                    $serverPdo = new PDO($serverDsn, $user, $pass, $options);
                    $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET $charset COLLATE utf8mb4_unicode_ci");
                    $serverPdo = null;

                    // Reconnect to newly created database
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

        // Auto-provision schema on first connection if tables do not exist (replicates ddl-auto=update)
        if (!self::$initialized) {
            self::ensureTablesExist(self::$instance);
            self::$initialized = true;
        }

        return self::$instance;
    }

    /**
     * Ensures the enquiries and rate_limits tables exist in the database.
     */
    private static function ensureTablesExist(PDO $pdo): void {
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
        try {
            $pdo->exec($schemaSql);
        } catch (PDOException $e) {
            error_log("Error ensuring database tables exist: " . $e->getMessage());
        }
    }
}
