-- ============================================================
-- SUPABASE DATABASE SCHEMA FOR MADZZ CEXI CPANEL VIP BOT
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- 1. TABLE: users - Untuk menyimpan data user
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE: tiers - Untuk menyimpan tier pengguna
CREATE TABLE IF NOT EXISTS tiers (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    tier VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    adp_created_srv1 BOOLEAN DEFAULT FALSE,
    adp_created_srv2 BOOLEAN DEFAULT FALSE,
    adp_created_srv3 BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_user FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- 3. TABLE: server_access - Untuk menyimpan akses server per user
CREATE TABLE IF NOT EXISTS server_access (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    server_id VARCHAR(10) NOT NULL, -- srv1, srv2, srv3
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(telegram_id, server_id),
    CONSTRAINT fk_user_access FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- 4. TABLE: premium_users - Untuk menyimpan user premium
CREATE TABLE IF NOT EXISTS premium_users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    added_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_user_premium FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- 5. TABLE: admin_users - Untuk menyimpan user admin
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    added_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_user_admin FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- 6. TABLE: channels - Untuk menyimpan channel broadcast
CREATE TABLE IF NOT EXISTS channels (
    id BIGSERIAL PRIMARY KEY,
    channel_id VARCHAR(100) UNIQUE NOT NULL,
    added_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABLE: panels - Untuk menyimpan panel yang dibuat
CREATE TABLE IF NOT EXISTS panels (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    server_id VARCHAR(10) NOT NULL,
    panel_username VARCHAR(255),
    panel_email VARCHAR(255),
    pterodactyl_user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_user_panel FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- 8. TABLE: bot_settings - Untuk menyimpan pengaturan bot
CREATE TABLE IF NOT EXISTS bot_settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABLE: transactions - Untuk log transaksi
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50),
    transaction_type VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES untuk performa yang lebih baik
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tiers_telegram_id ON tiers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_server_access_telegram_id ON server_access(telegram_id);
CREATE INDEX IF NOT EXISTS idx_server_access_server_id ON server_access(server_id);
CREATE INDEX IF NOT EXISTS idx_premium_users_telegram_id ON premium_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_panels_telegram_id ON panels(telegram_id);
CREATE INDEX IF NOT EXISTS idx_transactions_telegram_id ON transactions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================================
-- FUNGSI HELPER (RPC Functions)
-- ============================================================

-- Fungsi untuk mendapatkan tier user
CREATE OR REPLACE FUNCTION get_user_tier(p_telegram_id VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_tier VARCHAR;
BEGIN
    SELECT tier INTO v_tier FROM tiers WHERE telegram_id = p_telegram_id;
    RETURN v_tier;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk set tier user
CREATE OR REPLACE FUNCTION set_user_tier(p_telegram_id VARCHAR, p_tier VARCHAR)
RETURNS VOID AS $$
BEGIN
    INSERT INTO tiers (telegram_id, tier)
    VALUES (p_telegram_id, p_tier)
    ON CONFLICT (telegram_id) 
    DO UPDATE SET tier = p_tier;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk cek akses server
CREATE OR REPLACE FUNCTION check_server_access(p_telegram_id VARCHAR, p_server_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM server_access 
        WHERE telegram_id = p_telegram_id AND server_id = p_server_id
    ) INTO v_exists;
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk tambah akses server
CREATE OR REPLACE FUNCTION add_server_access(p_telegram_id VARCHAR, p_server_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    INSERT INTO server_access (telegram_id, server_id)
    VALUES (p_telegram_id, p_server_id)
    ON CONFLICT (telegram_id, server_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Optional tapi recommended
-- ============================================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;

-- Policy untuk service role (full access)
CREATE POLICY "Service role has full access to users" ON users
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to tiers" ON tiers
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to server_access" ON server_access
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to premium_users" ON premium_users
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to admin_users" ON admin_users
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to panels" ON panels
    FOR ALL USING (true);

-- ============================================================
-- SERVER MANAGEMENT TABLES (NEW - Dec 2025)
-- ============================================================

-- TABLE: user_servers - Track user's pterodactyl servers
CREATE TABLE IF NOT EXISTS user_servers (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    server_id INTEGER NOT NULL,
    panel_id VARCHAR(10) NOT NULL,
    server_identifier VARCHAR(50) NOT NULL,
    server_name VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(telegram_id, server_identifier, panel_id)
);

-- TABLE: server_actions - Log all server actions (upload, start, stop, etc)
CREATE TABLE IF NOT EXISTS server_actions (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    server_identifier VARCHAR(50) NOT NULL,
    panel_id VARCHAR(10) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_servers_telegram_id ON user_servers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_servers_panel_id ON user_servers(panel_id);
CREATE INDEX IF NOT EXISTS idx_server_actions_telegram_id ON server_actions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_server_actions_action ON server_actions(action);
CREATE INDEX IF NOT EXISTS idx_server_actions_created_at ON server_actions(created_at);

-- RLS for new tables
ALTER TABLE user_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to user_servers" ON user_servers
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to server_actions" ON server_actions
    FOR ALL USING (true);

-- ============================================================
-- SERVER CONFIGS TABLE (Dec 2025) - Store Panel Server Configs
-- ============================================================

-- TABLE: server_configs - Store server configuration (domain, API keys)
CREATE TABLE IF NOT EXISTS server_configs (
    id BIGSERIAL PRIMARY KEY,
    server_id VARCHAR(10) UNIQUE NOT NULL, -- srv1, srv2, srv3
    server_name VARCHAR(100),
    domain TEXT NOT NULL,
    plta VARCHAR(255) NOT NULL, -- Application API Key
    pltc VARCHAR(255) NOT NULL, -- Client API Key
    is_active BOOLEAN DEFAULT TRUE,
    location_id INTEGER DEFAULT 1,
    eggs_id INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by VARCHAR(50)
);

-- Indexes for server_configs
CREATE INDEX IF NOT EXISTS idx_server_configs_server_id ON server_configs(server_id);
CREATE INDEX IF NOT EXISTS idx_server_configs_active ON server_configs(is_active);

-- RLS for server_configs
ALTER TABLE server_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to server_configs" ON server_configs
    FOR ALL USING (true);

-- ============================================================
-- AI MEMORY TABLES (Dec 2025) - Cexi Wahiru Memory System
-- ============================================================

-- TABLE: ai_memories - Store AI conversation memories per user
CREATE TABLE IF NOT EXISTS ai_memories (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    memory_type VARCHAR(50) NOT NULL, -- 'fact', 'preference', 'conversation', 'quick_action'
    memory_key VARCHAR(255), -- Key for quick lookup (e.g., 'name', 'hobby', 'favorite_color')
    memory_value TEXT NOT NULL, -- The actual memory content
    context TEXT, -- Additional context about when/why this was saved
    importance INTEGER DEFAULT 5, -- 1-10 scale, higher = more important to remember
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry for temporary memories
    is_active BOOLEAN DEFAULT TRUE
);

-- TABLE: ai_quick_actions - Store user's quick action preferences
CREATE TABLE IF NOT EXISTS ai_quick_actions (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    action_name VARCHAR(100) NOT NULL, -- e.g., 'check_panel', 'server_status', 'help_panel'
    action_trigger VARCHAR(255) NOT NULL, -- Trigger words/phrases
    action_response TEXT, -- Custom response template
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(telegram_id, action_name)
);

-- TABLE: ai_conversation_history - Store recent conversation context
CREATE TABLE IF NOT EXISTS ai_conversation_history (
    id BIGSERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for AI memory tables
CREATE INDEX IF NOT EXISTS idx_ai_memories_telegram_id ON ai_memories(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_type ON ai_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_memories_key ON ai_memories(memory_key);
CREATE INDEX IF NOT EXISTS idx_ai_memories_active ON ai_memories(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_quick_actions_telegram_id ON ai_quick_actions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_history_telegram_id ON ai_conversation_history(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_history_created ON ai_conversation_history(created_at);

-- RLS for AI tables
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_quick_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to ai_memories" ON ai_memories
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to ai_quick_actions" ON ai_quick_actions
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to ai_conversation_history" ON ai_conversation_history
    FOR ALL USING (true);

-- ============================================================
-- GROUP MEMBER TRACKING (Dec 2025) - Track group members for AI context
-- ============================================================

-- TABLE: group_members - Track all members in each group for AI memory
CREATE TABLE IF NOT EXISTS group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL,
    telegram_id VARCHAR(50) NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    is_bot BOOLEAN DEFAULT FALSE,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(group_id, telegram_id)
);

-- TABLE: group_info - Store group metadata
CREATE TABLE IF NOT EXISTS group_info (
    id BIGSERIAL PRIMARY KEY,
    group_id VARCHAR(50) UNIQUE NOT NULL,
    group_name VARCHAR(255),
    group_type VARCHAR(50), -- 'group', 'supergroup', 'channel'
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for group tracking
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_telegram_id ON group_members(telegram_id);
CREATE INDEX IF NOT EXISTS idx_group_members_active ON group_members(is_active);
CREATE INDEX IF NOT EXISTS idx_group_info_group_id ON group_info(group_id);

-- RLS for group tables
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to group_members" ON group_members
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to group_info" ON group_info
    FOR ALL USING (true);

-- ============================================================
-- INSERT DEFAULT DATA
-- ============================================================

-- Insert default bot settings
INSERT INTO bot_settings (key, value) VALUES 
    ('bot_status', 'running'),
    ('version', '1.0'),
    ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SELESAI! 
-- Copy dan run SQL ini di Supabase SQL Editor
-- ============================================================
