-- ============================================================
-- TIER FUNCTIONS MANAGEMENT SCHEMA
-- Untuk mengatur function mana yang boleh diakses oleh setiap tier
-- Run SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. TABLE: bot_functions - Senarai semua functions bot
CREATE TABLE IF NOT EXISTS bot_functions (
    id BIGSERIAL PRIMARY KEY,
    function_name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE: tier_permissions - Tier mana boleh guna function mana
CREATE TABLE IF NOT EXISTS tier_permissions (
    id BIGSERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    function_name VARCHAR(100) NOT NULL,
    is_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tier_name, function_name)
);

-- ============================================================
-- INDEXES untuk performa yang lebih baik
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bot_functions_category ON bot_functions(category);
CREATE INDEX IF NOT EXISTS idx_bot_functions_name ON bot_functions(function_name);
CREATE INDEX IF NOT EXISTS idx_tier_permissions_tier ON tier_permissions(tier_name);
CREATE INDEX IF NOT EXISTS idx_tier_permissions_function ON tier_permissions(function_name);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE bot_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to bot_functions" ON bot_functions
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to tier_permissions" ON tier_permissions
    FOR ALL USING (true);

-- ============================================================
-- INSERT DEFAULT BOT FUNCTIONS
-- Semua 100+ functions bot
-- ============================================================

INSERT INTO bot_functions (function_name, description, category) VALUES
    -- GENERAL COMMANDS
    ('start', 'Start bot / Menu utama', 'general'),
    ('about', 'Info tentang bot', 'general'),
    ('contact', 'Contact developer', 'general'),
    ('status', 'Status bot', 'general'),
    ('tier', 'Lihat tier user', 'general'),
    ('info', 'Info user details', 'general'),
    ('cancel', 'Cancel current operation', 'general'),
    
    -- PANEL MANAGEMENT
    ('createpanel', 'Buat panel baru', 'panel'),
    ('delpanel', 'Delete panel', 'panel'),
    ('listpanels', 'Senarai panels', 'panel'),
    ('selfcreate', 'Self-create panel', 'panel'),
    ('selfdelete', 'Self-delete panel', 'panel'),
    ('cadp', 'Create ADP panel', 'panel'),
    ('unli', 'Create unlimited panel', 'panel'),
    ('1gb', 'Create 1GB panel', 'panel'),
    ('1024', 'Create 1024MB panel', 'panel'),
    ('256', 'Create 256MB panel', 'panel'),
    ('512', 'Create 512MB panel', 'panel'),
    ('768', 'Create 768MB panel', 'panel'),
    ('2gb', 'Create 2GB panel', 'panel'),
    ('3gb', 'Create 3GB panel', 'panel'),
    ('4gb', 'Create 4GB panel', 'panel'),
    ('5gb', 'Create 5GB panel', 'panel'),
    ('6gb', 'Create 6GB panel', 'panel'),
    ('8gb', 'Create 8GB panel', 'panel'),
    ('10gb', 'Create 10GB panel', 'panel'),
    ('16gb', 'Create 16GB panel', 'panel'),
    ('32gb', 'Create 32GB panel', 'panel'),
    ('50gb', 'Create 50GB panel', 'panel'),
    ('100gb', 'Create 100GB panel', 'panel'),
    ('200gb', 'Create 200GB panel', 'panel'),
    ('500gb', 'Create 500GB panel', 'panel'),
    ('1tb', 'Create 1TB panel', 'panel'),
    
    -- SERVER MANAGEMENT
    ('server', 'Server menu', 'server'),
    ('cekserver', 'Check server status', 'server'),
    ('upserver', 'Upload to server', 'server'),
    ('downserver', 'Download from server', 'server'),
    ('listsrv', 'List all servers', 'server'),
    ('delsrv', 'Delete server', 'server'),
    ('delallsrv', 'Delete all servers', 'server'),
    ('suspend', 'Suspend server', 'server'),
    ('unsuspend', 'Unsuspend server', 'server'),
    ('restart', 'Restart server', 'server'),
    
    -- USER MANAGEMENT
    ('listuser', 'List all users', 'user'),
    ('listusr', 'List users short', 'user'),
    ('delusr', 'Delete user', 'user'),
    ('adduser', 'Add new user', 'user'),
    ('myusers', 'My created users', 'user'),
    ('activity', 'User activity log', 'user'),
    
    -- TIER MANAGEMENT
    ('listtier', 'List all tiers', 'tier'),
    ('deltier', 'Delete tier', 'tier'),
    ('address', 'Add reseller', 'tier'),
    ('addpem', 'Add pembokep', 'tier'),
    ('addmurnel', 'Add murid panel', 'tier'),
    ('addprem', 'Add premium', 'tier'),
    ('addown', 'Add owner', 'tier'),
    ('addmemvip', 'Add member VIP', 'tier'),
    ('addowgtng', 'Add owner ganteng', 'tier'),
    ('addpt', 'Add PT', 'tier'),
    ('addtk', 'Add TK', 'tier'),
    ('addpenguasa', 'Add penguasa panel', 'tier'),
    ('addceo', 'Add CEO', 'tier'),
    ('adddev', 'Add developer', 'tier'),
    ('addownutama', 'Add owner utama', 'tier'),
    
    -- ADP MANAGEMENT
    ('listadp', 'List ADP users', 'adp'),
    
    -- NODE MANAGEMENT
    ('listnodes', 'List all nodes', 'node'),
    ('nodeactive', 'Toggle node active', 'node'),
    ('nodeunlis', 'Toggle node unlis', 'node'),
    
    -- ATTACK METHODS
    ('methods', 'Show attack methods', 'attack'),
    ('l7', 'Layer 7 attack', 'attack'),
    ('l4', 'Layer 4 attack', 'attack'),
    ('http', 'HTTP attack', 'attack'),
    ('locall7', 'Local Layer 7 attack', 'attack'),
    ('locall4', 'Local Layer 4 attack', 'attack'),
    ('local7', 'Local 7 methods', 'attack'),
    ('local4', 'Local 4 methods', 'attack'),
    ('localmethods', 'Local methods list', 'attack'),
    ('double', 'Double attack', 'attack'),
    ('running', 'Running attacks', 'attack'),
    ('stop', 'Stop attack', 'attack'),
    ('stopall', 'Stop all attacks', 'attack'),
    
    -- BOTNET MANAGEMENT
    ('addbot', 'Add bot to botnet', 'botnet'),
    ('delbot', 'Delete bot from botnet', 'botnet'),
    ('testbot', 'Test bot connection', 'botnet'),
    ('listbot', 'List all bots', 'botnet'),
    
    -- TOOLS
    ('tempmail', 'Generate temp email', 'tools'),
    ('inbox', 'Check email inbox', 'tools'),
    ('readmail', 'Read email', 'tools'),
    ('tempnum', 'Get temp number', 'tools'),
    ('countries', 'List countries for tempnum', 'tools'),
    ('smsread', 'Read SMS', 'tools'),
    ('scan', 'Scan URL/target', 'tools'),
    ('urlinfo', 'Get URL info', 'tools'),
    ('tourl', 'Convert to URL', 'tools'),
    ('brat', 'Brat text generator', 'tools'),
    
    -- MEDIA DOWNLOAD
    ('tiktok', 'Download TikTok video', 'media'),
    ('play', 'Play music', 'media'),
    ('playmusik', 'Play musik search', 'media'),
    
    -- BROADCAST
    ('broadcast', 'Broadcast message', 'broadcast'),
    ('addch', 'Add channel', 'broadcast'),
    ('done', 'Mark task done', 'broadcast'),
    ('rch', 'Remove channel', 'broadcast'),
    
    -- VPS MANAGEMENT
    ('entervps', 'Enter VPS mode', 'vps'),
    ('exitvps', 'Exit VPS mode', 'vps'),
    ('vpsstatus', 'VPS status', 'vps'),
    
    -- PROTECT/UNPROTECT
    ('protect', 'Protect server', 'protect'),
    ('unprotect', 'Unprotect server', 'protect'),
    ('installtheme', 'Install theme', 'protect'),
    
    -- WINGS MANAGEMENT
    ('startwings', 'Start wings', 'wings'),
    ('swings', 'Start wings shortcut', 'wings'),
    ('uninstallwings', 'Uninstall wings', 'wings'),
    
    -- PROXY
    ('scrapeproxy', 'Scrape proxies', 'proxy'),
    ('proxystat', 'Proxy statistics', 'proxy'),
    ('proxystats', 'Proxy statistics', 'proxy'),
    
    -- TRANSFER
    ('all', 'Transfer all', 'transfer'),
    
    -- ADMIN TIER MANAGEMENT (New)
    ('tiermgmt', 'Tier management menu', 'admin'),
    ('functionlist', 'Function list with pagination', 'admin')
    
ON CONFLICT (function_name) DO NOTHING;

-- ============================================================
-- INSERT DEFAULT TIER PERMISSIONS
-- Default permissions untuk setiap tier
-- ============================================================

-- DEV tier - akses semua
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'DEV', function_name, TRUE FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- CEO tier - hampir semua kecuali adddev
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'CEO', function_name, 
    CASE WHEN function_name IN ('adddev') THEN FALSE ELSE TRUE END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- PENGUASA PANEL tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'PENGUASA PANEL', function_name, 
    CASE WHEN function_name IN ('adddev', 'addceo', 'broadcast', 'stopall') THEN FALSE ELSE TRUE END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- TK tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'TK', function_name, 
    CASE WHEN function_name IN ('adddev', 'addceo', 'addpenguasa', 'broadcast', 'stopall', 'delallsrv') THEN FALSE ELSE TRUE END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- PT tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'PT', function_name, 
    CASE WHEN function_name IN ('adddev', 'addceo', 'addpenguasa', 'addtk', 'broadcast', 'stopall', 'delallsrv') THEN FALSE ELSE TRUE END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- OWNER GANTENG tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'OWNER GANTENG', function_name, 
    CASE WHEN function_name IN ('adddev', 'addceo', 'addpenguasa', 'addtk', 'addpt', 'broadcast', 'stopall', 'delallsrv', 'delusr', 'delsrv') THEN FALSE ELSE TRUE END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- MEMBER VIP tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'MEMBER VIP', function_name, 
    CASE WHEN function_name IN ('adddev', 'addceo', 'addpenguasa', 'addtk', 'addpt', 'addowgtng', 'broadcast', 'stopall', 'delallsrv', 'delusr', 'delsrv') THEN FALSE ELSE TRUE END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- OWN tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'OWN', function_name, 
    CASE WHEN function_name IN ('adddev', 'addceo', 'addpenguasa', 'addtk', 'addpt', 'addowgtng', 'addmemvip', 'broadcast', 'stopall', 'delallsrv', 'delusr', 'delsrv', 'suspend', 'unsuspend') THEN FALSE ELSE TRUE END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- ADP tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'ADP', function_name, 
    CASE 
        WHEN function_name IN ('start', 'about', 'contact', 'status', 'tier', 'info', 'cancel', 'createpanel', 'cadp', 'selfcreate', 'listpanels', 'myusers', 'activity', 'tempmail', 'inbox', 'tempnum', 'countries', 'smsread', 'brat', 'tourl', 'urlinfo') THEN TRUE 
        ELSE FALSE 
    END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- MURID PANEL tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'MURID PANEL', function_name, 
    CASE 
        WHEN function_name IN ('start', 'about', 'contact', 'status', 'tier', 'info', 'cancel', 'createpanel', 'listpanels', 'tempmail', 'inbox', 'tempnum', 'countries', 'smsread', 'brat', 'tourl') THEN TRUE 
        ELSE FALSE 
    END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- PEMBOKEP tier  
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'PEMBOKEP', function_name, 
    CASE 
        WHEN function_name IN ('start', 'about', 'contact', 'status', 'tier', 'info', 'cancel', 'createpanel', 'listpanels', 'tempmail', 'inbox', 'tempnum', 'countries', 'smsread', 'brat', 'tourl') THEN TRUE 
        ELSE FALSE 
    END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- RESELLER tier
INSERT INTO tier_permissions (tier_name, function_name, is_allowed)
SELECT 'RESELLER', function_name, 
    CASE 
        WHEN function_name IN ('start', 'about', 'contact', 'status', 'tier', 'info', 'cancel', 'createpanel', 'listpanels', 'tempmail', 'inbox', 'tempnum', 'countries', 'smsread', 'brat', 'tourl') THEN TRUE 
        ELSE FALSE 
    END
FROM bot_functions
ON CONFLICT (tier_name, function_name) DO NOTHING;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Fungsi untuk cek permission tier
CREATE OR REPLACE FUNCTION check_tier_permission(p_tier_name VARCHAR, p_function_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_allowed BOOLEAN;
BEGIN
    SELECT is_allowed INTO v_allowed 
    FROM tier_permissions 
    WHERE tier_name = p_tier_name AND function_name = p_function_name;
    
    RETURN COALESCE(v_allowed, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk get all functions untuk tier
CREATE OR REPLACE FUNCTION get_tier_functions(p_tier_name VARCHAR)
RETURNS TABLE(function_name VARCHAR, is_allowed BOOLEAN, category VARCHAR, description VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT bf.function_name, COALESCE(tp.is_allowed, FALSE), bf.category, bf.description
    FROM bot_functions bf
    LEFT JOIN tier_permissions tp ON bf.function_name = tp.function_name AND tp.tier_name = p_tier_name
    WHERE bf.is_active = TRUE
    ORDER BY bf.category, bf.function_name;
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk set permission
CREATE OR REPLACE FUNCTION set_tier_permission(p_tier_name VARCHAR, p_function_name VARCHAR, p_allowed BOOLEAN)
RETURNS VOID AS $$
BEGIN
    INSERT INTO tier_permissions (tier_name, function_name, is_allowed, updated_at)
    VALUES (p_tier_name, p_function_name, p_allowed, NOW())
    ON CONFLICT (tier_name, function_name) 
    DO UPDATE SET is_allowed = p_allowed, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Fungsi untuk get functions dengan pagination
CREATE OR REPLACE FUNCTION get_functions_paginated(p_page INTEGER DEFAULT 1, p_limit INTEGER DEFAULT 10, p_category VARCHAR DEFAULT NULL)
RETURNS TABLE(
    function_name VARCHAR, 
    description VARCHAR, 
    category VARCHAR, 
    total_count BIGINT,
    total_pages INTEGER
) AS $$
DECLARE
    v_offset INTEGER;
    v_total BIGINT;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    SELECT COUNT(*) INTO v_total 
    FROM bot_functions bf 
    WHERE bf.is_active = TRUE 
    AND (p_category IS NULL OR bf.category = p_category);
    
    RETURN QUERY
    SELECT bf.function_name, bf.description, bf.category, v_total, CEIL(v_total::NUMERIC / p_limit)::INTEGER
    FROM bot_functions bf
    WHERE bf.is_active = TRUE
    AND (p_category IS NULL OR bf.category = p_category)
    ORDER BY bf.category, bf.function_name
    OFFSET v_offset
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SELESAI!
-- Copy dan run SQL ini di Supabase SQL Editor
-- ============================================================
