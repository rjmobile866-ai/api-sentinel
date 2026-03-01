-- =============================================
-- MIGRATION 001: INITIAL SCHEMA
-- =============================================
-- Description: Creates all tables, RLS policies, functions and triggers
-- Run this FIRST in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. CREATE TABLES
-- =============================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    email text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- APIs Table
CREATE TABLE IF NOT EXISTS public.apis (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    name text NOT NULL,
    url text NOT NULL,
    method text NOT NULL DEFAULT 'GET',
    headers jsonb DEFAULT '{}'::jsonb,
    body jsonb DEFAULT '{}'::jsonb,
    query_params jsonb DEFAULT '{}'::jsonb,
    enabled boolean DEFAULT true,
    proxy_enabled boolean DEFAULT false,
    force_proxy boolean DEFAULT true,
    rotation_enabled boolean DEFAULT false,
    residential_proxy_enabled boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- API Logs Table
CREATE TABLE IF NOT EXISTS public.api_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    api_id uuid REFERENCES public.apis(id) ON DELETE CASCADE,
    api_name text NOT NULL,
    mode text NOT NULL,
    success boolean NOT NULL,
    status_code integer,
    response_time integer,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- CORS Proxies Table
CREATE TABLE IF NOT EXISTS public.cors_proxies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Hit Logs Table
CREATE TABLE IF NOT EXISTS public.hit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Site Config Table
CREATE TABLE IF NOT EXISTS public.site_config (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User Passwords Table
CREATE TABLE IF NOT EXISTS public.user_passwords (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    password text NOT NULL,
    is_active boolean DEFAULT true,
    device_ip text,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cors_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. RLS POLICIES - PROFILES
-- =============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 4. RLS POLICIES - APIS (Public Access)
-- =============================================

DROP POLICY IF EXISTS "Allow public read access to apis" ON public.apis;
CREATE POLICY "Allow public read access to apis"
ON public.apis FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to apis" ON public.apis;
CREATE POLICY "Allow public insert access to apis"
ON public.apis FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to apis" ON public.apis;
CREATE POLICY "Allow public update access to apis"
ON public.apis FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access to apis" ON public.apis;
CREATE POLICY "Allow public delete access to apis"
ON public.apis FOR DELETE USING (true);

-- =============================================
-- 5. RLS POLICIES - API LOGS
-- =============================================

DROP POLICY IF EXISTS "Users can view their own logs" ON public.api_logs;
CREATE POLICY "Users can view their own logs"
ON public.api_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.api_logs;
CREATE POLICY "Users can insert their own logs"
ON public.api_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own logs" ON public.api_logs;
CREATE POLICY "Users can delete their own logs"
ON public.api_logs FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. RLS POLICIES - CORS PROXIES
-- =============================================

DROP POLICY IF EXISTS "Users can view their own proxies" ON public.cors_proxies;
CREATE POLICY "Users can view their own proxies"
ON public.cors_proxies FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own proxies" ON public.cors_proxies;
CREATE POLICY "Users can insert their own proxies"
ON public.cors_proxies FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own proxies" ON public.cors_proxies;
CREATE POLICY "Users can update their own proxies"
ON public.cors_proxies FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own proxies" ON public.cors_proxies;
CREATE POLICY "Users can delete their own proxies"
ON public.cors_proxies FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 7. RLS POLICIES - HIT LOGS (Public Access)
-- =============================================

DROP POLICY IF EXISTS "Allow public read hit_logs" ON public.hit_logs;
CREATE POLICY "Allow public read hit_logs"
ON public.hit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to hit_logs" ON public.hit_logs;
CREATE POLICY "Allow public insert to hit_logs"
ON public.hit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete hit_logs" ON public.hit_logs;
CREATE POLICY "Allow public delete hit_logs"
ON public.hit_logs FOR DELETE USING (true);

-- =============================================
-- 8. RLS POLICIES - SITE CONFIG (Public Access)
-- =============================================

DROP POLICY IF EXISTS "Allow public read access to site_config" ON public.site_config;
CREATE POLICY "Allow public read access to site_config"
ON public.site_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to site_config" ON public.site_config;
CREATE POLICY "Allow public insert access to site_config"
ON public.site_config FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to site_config" ON public.site_config;
CREATE POLICY "Allow public update access to site_config"
ON public.site_config FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete access to site_config" ON public.site_config;
CREATE POLICY "Allow public delete access to site_config"
ON public.site_config FOR DELETE USING (true);

-- =============================================
-- 9. RLS POLICIES - USER PASSWORDS (Public Access)
-- =============================================

DROP POLICY IF EXISTS "Allow public read user_passwords" ON public.user_passwords;
CREATE POLICY "Allow public read user_passwords"
ON public.user_passwords FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert user_passwords" ON public.user_passwords;
CREATE POLICY "Allow public insert user_passwords"
ON public.user_passwords FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update user_passwords" ON public.user_passwords;
CREATE POLICY "Allow public update user_passwords"
ON public.user_passwords FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete user_passwords" ON public.user_passwords;
CREATE POLICY "Allow public delete user_passwords"
ON public.user_passwords FOR DELETE USING (true);

-- =============================================
-- 10. FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email) VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- 11. TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_apis_updated_at ON public.apis;
CREATE TRIGGER update_apis_updated_at
    BEFORE UPDATE ON public.apis
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 12. INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_apis_user_id ON public.apis(user_id);
CREATE INDEX IF NOT EXISTS idx_apis_enabled ON public.apis(enabled);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON public.api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_api_id ON public.api_logs(api_id);
CREATE INDEX IF NOT EXISTS idx_cors_proxies_user_id ON public.cors_proxies(user_id);
CREATE INDEX IF NOT EXISTS idx_cors_proxies_is_active ON public.cors_proxies(is_active);
CREATE INDEX IF NOT EXISTS idx_hit_logs_phone ON public.hit_logs(phone);
CREATE INDEX IF NOT EXISTS idx_hit_logs_created_at ON public.hit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_config_key ON public.site_config(key);
CREATE INDEX IF NOT EXISTS idx_user_passwords_is_active ON public.user_passwords(is_active);

-- =============================================
-- MIGRATION 001 COMPLETE! ✅
-- =============================================
