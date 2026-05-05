-- Create system_settings table for storing passwords and other settings
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster key lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default passwords if not exists
INSERT INTO system_settings (key, value, updated_at) 
VALUES 
    ('console_password', 'man23148', NOW()),
    ('web_password', 'man23148', NOW())
ON CONFLICT (key) DO NOTHING;
