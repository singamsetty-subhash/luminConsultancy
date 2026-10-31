-- ===================================================================
-- Lumin Consultancy Web Portal & Laboratory Management Platform
-- PostgreSQL Database Schema (Render / Supabase / Neon / Local PostgreSQL)
-- ===================================================================

-- Enquiries Table
-- Stores prospective laboratory consultation requests
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

-- Rate Limits Table
-- Tracks IP request timestamps for sliding-window rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    ip VARCHAR(45) NOT NULL,
    hit_time BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_hit ON rate_limits (ip, hit_time);

