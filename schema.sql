-- ===================================================================
-- Lumin Consultancy Web Portal & Laboratory Management Platform
-- MySQL Database Schema (Replaces Hibernate / JPA Auto-DDL)
-- ===================================================================

CREATE DATABASE IF NOT EXISTS `lumindb` 
    DEFAULT CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE `lumindb`;

-- -------------------------------------------------------------------
-- Enquiries Table
-- Stores prospective laboratory consultation requests
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `enquiries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL COMMENT 'Full name of the prospect/representative',
    `organization` VARCHAR(160) NOT NULL COMMENT 'Laboratory or company name',
    `designation` VARCHAR(120) DEFAULT NULL COMMENT 'Applicant job title or role',
    `email` VARCHAR(160) NOT NULL COMMENT 'Contact email address',
    `phone` VARCHAR(40) NOT NULL COMMENT 'Contact phone number',
    `sector` VARCHAR(120) DEFAULT NULL COMMENT 'Testing sector or industry area',
    `service` VARCHAR(120) DEFAULT NULL COMMENT 'Requested consulting service',
    `status` VARCHAR(120) DEFAULT NULL COMMENT 'Current accreditation readiness status',
    `message` VARCHAR(3000) DEFAULT NULL COMMENT 'Detailed inquiry message or requirements',
    `preferred` VARCHAR(40) DEFAULT NULL COMMENT 'Preferred contact channel (Email, Phone, WhatsApp)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Submission timestamp in Asia/Kolkata timezone',
    PRIMARY KEY (`id`),
    INDEX `idx_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- Rate Limits Table
-- Tracks IP request timestamps for sliding-window rate limiting
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rate_limits` (
    `ip` VARCHAR(45) NOT NULL,
    `hit_time` BIGINT NOT NULL,
    INDEX `idx_ip_hit` (`ip`, `hit_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
