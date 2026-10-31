-- ===================================================================
-- Lumin Consultancy Web Portal & Laboratory Management Platform
-- Database Schemas for PostgreSQL (Render) & MySQL
-- ===================================================================

-- -------------------------------------------------------------------
-- SECTION 1: PostgreSQL Schema (Render / Supabase / Neon)
-- -------------------------------------------------------------------

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

-- -------------------------------------------------------------------
-- SECTION 2: MySQL Schema (XAMPP / WAMP / MySQL 8.0)
-- -------------------------------------------------------------------
/*
CREATE DATABASE IF NOT EXISTS `lumindb` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lumindb`;

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
*/
