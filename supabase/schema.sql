-- =============================================
-- 🚀 COMPLETE SUPABASE SCHEMA - ONE-CLICK SETUP
-- =============================================
-- Sirf yeh ek file Supabase SQL Editor me run karo
-- Sab automatic ho jayega - tables, RLS, functions, triggers
-- =============================================

-- =============================================
-- STEP 1: CLEANUP (Agar pehle se kuch hai toh)
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_apis_updated_at ON public.apis;

DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;

DROP TABLE IF EXISTS public.api_logs CASCADE;
DROP TABLE IF EXISTS public.apis CASCADE;
DROP TABLE IF EXISTS public.cors_proxies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.site_config CASCADE;
DROP TABLE IF EXISTS public.user_passwords CASCADE;
DROP TABLE IF EXISTS public.hit_logs CASCADE;

-- =============================================
-- STEP 2: CREATE TABLES
-- =============================================

-- Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    email text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- APIs Table
CREATE TABLE public.apis (
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
CREATE TABLE public.api_logs (
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
CREATE TABLE public.cors_proxies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Site Config Table
CREATE TABLE public.site_config (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User Passwords Table (IP-locked password system)
CREATE TABLE public.user_passwords (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    password text NOT NULL,
    device_ip text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_used_at timestamp with time zone
);

-- Hit Logs Table
CREATE TABLE public.hit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cors_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 4: RLS POLICIES - PROFILES
-- =============================================

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- STEP 5: RLS POLICIES - APIS (Public access - no auth required)
-- =============================================

CREATE POLICY "Allow public read access to apis" ON public.apis FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to apis" ON public.apis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to apis" ON public.apis FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to apis" ON public.apis FOR DELETE USING (true);

-- =============================================
-- STEP 6: RLS POLICIES - API LOGS
-- =============================================

CREATE POLICY "Users can view their own logs" ON public.api_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own logs" ON public.api_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own logs" ON public.api_logs FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- STEP 7: RLS POLICIES - CORS PROXIES
-- =============================================

CREATE POLICY "Users can view their own proxies" ON public.cors_proxies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own proxies" ON public.cors_proxies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own proxies" ON public.cors_proxies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own proxies" ON public.cors_proxies FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- STEP 8: RLS POLICIES - SITE CONFIG (Public access)
-- =============================================

CREATE POLICY "Allow public read access to site_config" ON public.site_config FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to site_config" ON public.site_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to site_config" ON public.site_config FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to site_config" ON public.site_config FOR DELETE USING (true);

-- =============================================
-- STEP 9: RLS POLICIES - USER PASSWORDS (Public access)
-- =============================================

CREATE POLICY "Allow public read user_passwords" ON public.user_passwords FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_passwords" ON public.user_passwords FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update user_passwords" ON public.user_passwords FOR UPDATE USING (true);
CREATE POLICY "Allow public delete user_passwords" ON public.user_passwords FOR DELETE USING (true);

-- =============================================
-- STEP 10: RLS POLICIES - HIT LOGS (Public access)
-- =============================================

CREATE POLICY "Allow public read hit_logs" ON public.hit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert to hit_logs" ON public.hit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete hit_logs" ON public.hit_logs FOR DELETE USING (true);

-- =============================================
-- STEP 11: FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =============================================
-- STEP 12: TRIGGERS
-- =============================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_apis_updated_at
    BEFORE UPDATE ON public.apis
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STEP 13: INDEXES
-- =============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_apis_user_id ON public.apis(user_id);
CREATE INDEX idx_apis_enabled ON public.apis(enabled);
CREATE INDEX idx_api_logs_user_id ON public.api_logs(user_id);
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX idx_api_logs_api_id ON public.api_logs(api_id);
CREATE INDEX idx_cors_proxies_user_id ON public.cors_proxies(user_id);
CREATE INDEX idx_cors_proxies_is_active ON public.cors_proxies(is_active);
CREATE INDEX idx_user_passwords_is_active ON public.user_passwords(is_active);
CREATE INDEX idx_hit_logs_phone ON public.hit_logs(phone);

-- =============================================
-- STEP 14: SEED DATA - Default Admin Password
-- =============================================

INSERT INTO public.site_config (key, value) VALUES ('admin_password', 'xyzdark6767@@');

-- =============================================
-- STEP 15: ENABLE REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.api_logs;

-- =============================================
-- ✅ SETUP COMPLETE!
-- =============================================
