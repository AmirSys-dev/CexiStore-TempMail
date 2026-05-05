-- ============================================================
-- WEB ADMIN TABLES SCHEMA (Tempmail Web)
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------
-- web_inventory: premium account stock for tool orders
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.web_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'web_inventory_status_check'
          AND conrelid = 'public.web_inventory'::regclass
    ) THEN
        ALTER TABLE public.web_inventory
        ADD CONSTRAINT web_inventory_status_check
        CHECK (status IN ('available', 'used'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_web_inventory_platform ON public.web_inventory (platform);
CREATE INDEX IF NOT EXISTS idx_web_inventory_status ON public.web_inventory (status);
CREATE INDEX IF NOT EXISTS idx_web_inventory_created_at ON public.web_inventory (created_at DESC);

-- ----------------------------------------
-- web_nodes: Pterodactyl node definitions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.web_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    fqdn TEXT NOT NULL,
    memory INTEGER NOT NULL DEFAULT 2048,
    disk INTEGER NOT NULL DEFAULT 10240,
    plta_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'web_nodes_memory_check'
          AND conrelid = 'public.web_nodes'::regclass
    ) THEN
        ALTER TABLE public.web_nodes
        ADD CONSTRAINT web_nodes_memory_check CHECK (memory > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'web_nodes_disk_check'
          AND conrelid = 'public.web_nodes'::regclass
    ) THEN
        ALTER TABLE public.web_nodes
        ADD CONSTRAINT web_nodes_disk_check CHECK (disk > 0);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_web_nodes_fqdn ON public.web_nodes (fqdn);
CREATE INDEX IF NOT EXISTS idx_web_nodes_created_at ON public.web_nodes (created_at DESC);

-- ----------------------------------------
-- web_eggs: Pterodactyl egg definitions
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.web_eggs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    egg_id INTEGER NOT NULL,
    nest_id INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '#0ea5e9',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'web_eggs_identity_unique'
          AND conrelid = 'public.web_eggs'::regclass
    ) THEN
        ALTER TABLE public.web_eggs
        ADD CONSTRAINT web_eggs_identity_unique UNIQUE (egg_id, nest_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_web_eggs_created_at ON public.web_eggs (created_at DESC);

-- -----------------------------------------------------------------
-- Shared updated_at trigger for all web admin tables in this script
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.web_admin_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_web_inventory_updated_at ON public.web_inventory;
CREATE TRIGGER trg_web_inventory_updated_at
BEFORE UPDATE ON public.web_inventory
FOR EACH ROW
EXECUTE FUNCTION public.web_admin_set_updated_at();

DROP TRIGGER IF EXISTS trg_web_nodes_updated_at ON public.web_nodes;
CREATE TRIGGER trg_web_nodes_updated_at
BEFORE UPDATE ON public.web_nodes
FOR EACH ROW
EXECUTE FUNCTION public.web_admin_set_updated_at();

DROP TRIGGER IF EXISTS trg_web_eggs_updated_at ON public.web_eggs;
CREATE TRIGGER trg_web_eggs_updated_at
BEFORE UPDATE ON public.web_eggs
FOR EACH ROW
EXECUTE FUNCTION public.web_admin_set_updated_at();

-- -------------
-- RLS + policy
-- -------------
ALTER TABLE public.web_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_eggs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'web_inventory'
          AND policyname = 'service_role_full_access_web_inventory'
    ) THEN
        CREATE POLICY service_role_full_access_web_inventory
            ON public.web_inventory
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'web_nodes'
          AND policyname = 'service_role_full_access_web_nodes'
    ) THEN
        CREATE POLICY service_role_full_access_web_nodes
            ON public.web_nodes
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'web_eggs'
          AND policyname = 'service_role_full_access_web_eggs'
    ) THEN
        CREATE POLICY service_role_full_access_web_eggs
            ON public.web_eggs
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;
