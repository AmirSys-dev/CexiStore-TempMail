-- ============================================================
-- SUPABASE DATABASE SCHEMA UPDATE
-- Untuk fungsi Node Active/Unlis, Self Create tracking, Activity User
-- Run SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. TABLE: created_users - Track siapa yang create user di Pterodactyl
CREATE TABLE IF NOT EXISTS created_users (
    id BIGSERIAL PRIMARY KEY,
    creator_telegram_id VARCHAR(50) NOT NULL,
    pterodactyl_user_id INTEGER NOT NULL,
    pterodactyl_username VARCHAR(255) NOT NULL,
    server_id VARCHAR(10) NOT NULL, -- srv1, srv2, srv3
    pterodactyl_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(creator_telegram_id, pterodactyl_user_id, server_id)
);

-- 2. TABLE: user_activity - Log aktiviti creation
CREATE TABLE IF NOT EXISTS user_activity (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'create_user', 'create_server', 'selfcreate'
    target_username VARCHAR(255),
    target_telegram_id VARCHAR(50),
    server_id VARCHAR(10),
    package VARCHAR(20),
    egg_id INTEGER,
    node_id INTEGER,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE: node_settings - Untuk toggle node active/inactive
CREATE TABLE IF NOT EXISTS node_settings (
    id BIGSERIAL PRIMARY KEY,
    server_id VARCHAR(10) NOT NULL, -- srv1, srv2, srv3
    node_id INTEGER NOT NULL,
    node_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_unlis BOOLEAN DEFAULT FALSE, -- Node khusus untuk unli package
    max_servers INTEGER DEFAULT 0, -- 0 = unlimited
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(server_id, node_id)
);

-- ============================================================
-- INDEXES untuk performa
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_created_users_creator ON created_users(creator_telegram_id);
CREATE INDEX IF NOT EXISTS idx_created_users_ptero_user ON created_users(pterodactyl_user_id);
CREATE INDEX IF NOT EXISTS idx_created_users_server ON created_users(server_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_telegram ON user_activity(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_node_settings_server ON node_settings(server_id);

-- ============================================================
-- FUNGSI HELPER
-- ============================================================

-- Fungsi untuk mendapatkan created users oleh seseorang
CREATE OR REPLACE FUNCTION get_created_users(p_creator_id VARCHAR, p_server_id VARCHAR DEFAULT NULL)
RETURNS TABLE(
    pterodactyl_user_id INTEGER,
    pterodactyl_username VARCHAR,
    server_id VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_server_id IS NULL THEN
        RETURN QUERY
        SELECT cu.pterodactyl_user_id, cu.pterodactyl_username, cu.server_id, cu.created_at
        FROM created_users cu
        WHERE cu.creator_telegram_id = p_creator_id
        ORDER BY cu.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT cu.pterodactyl_user_id, cu.pterodactyl_username, cu.server_id, cu.created_at
        FROM created_users cu
        WHERE cu.creator_telegram_id = p_creator_id AND cu.server_id = p_server_id
        ORDER BY cu.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk cek apakah creator boleh access user tertentu
CREATE OR REPLACE FUNCTION can_access_ptero_user(p_creator_id VARCHAR, p_ptero_user_id INTEGER, p_server_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM created_users 
        WHERE creator_telegram_id = p_creator_id 
        AND pterodactyl_user_id = p_ptero_user_id 
        AND server_id = p_server_id
    ) INTO v_exists;
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk mendapatkan activity user
CREATE OR REPLACE FUNCTION get_user_activity(p_telegram_id VARCHAR, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(
    activity_type VARCHAR,
    target_username VARCHAR,
    server_id VARCHAR,
    package VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT ua.activity_type, ua.target_username, ua.server_id, ua.package, ua.created_at
    FROM user_activity ua
    WHERE ua.telegram_id = p_telegram_id
    ORDER BY ua.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk cek node active
CREATE OR REPLACE FUNCTION is_node_active(p_server_id VARCHAR, p_node_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_active BOOLEAN;
BEGIN
    SELECT is_active INTO v_active 
    FROM node_settings 
    WHERE server_id = p_server_id AND node_id = p_node_id;
    
    -- Default true jika tidak ada setting
    RETURN COALESCE(v_active, TRUE);
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk cek node unlis (untuk package UNLI sahaja)
CREATE OR REPLACE FUNCTION is_node_unlis(p_server_id VARCHAR, p_node_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_unlis BOOLEAN;
BEGIN
    SELECT is_unlis INTO v_unlis 
    FROM node_settings 
    WHERE server_id = p_server_id AND node_id = p_node_id;
    
    RETURN COALESCE(v_unlis, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE created_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to created_users" ON created_users
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to user_activity" ON user_activity
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to node_settings" ON node_settings
    FOR ALL USING (true);

-- ============================================================
-- SELESAI! 
-- Copy dan run SQL ini di Supabase SQL Editor
-- ============================================================
