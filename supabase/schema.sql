-- =============================================
-- COMPLETE SUPABASE SCHEMA FOR API TESTER APP
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- Make sure to run it in order (tables first, then policies, then functions)

-- =============================================
-- 1. CREATE TABLES
-- =============================================

-- Profiles Table (for user data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE,
    email text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- APIs Table (stores API configurations)
CREATE TABLE IF NOT EXISTS public.apis (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
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
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- API Logs Table (stores hit logs)
CREATE TABLE IF NOT EXISTS public.api_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    api_id uuid,
    api_name text NOT NULL,
    mode text NOT NULL,
    success boolean NOT NULL,
    status_code integer,
    response_time integer,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- CORS Proxies Table (stores proxy configurations)
CREATE TABLE IF NOT EXISTS public.cors_proxies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cors_proxies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. RLS POLICIES - PROFILES
-- =============================================

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- =============================================
-- 4. RLS POLICIES - APIS
-- =============================================

CREATE POLICY "Users can view their own APIs"
ON public.apis FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own APIs"
ON public.apis FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own APIs"
ON public.apis FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own APIs"
ON public.apis FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 5. RLS POLICIES - API LOGS
-- =============================================

CREATE POLICY "Users can view their own logs"
ON public.api_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
ON public.api_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs"
ON public.api_logs FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 6. RLS POLICIES - CORS PROXIES
-- =============================================

CREATE POLICY "Users can view their own proxies"
ON public.cors_proxies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proxies"
ON public.cors_proxies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proxies"
ON public.cors_proxies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proxies"
ON public.cors_proxies FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 7. FUNCTIONS
-- =============================================

-- Function to auto-create profile on new user signup
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

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- 8. TRIGGERS
-- =============================================

-- Trigger to auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on apis table
DROP TRIGGER IF EXISTS update_apis_updated_at ON public.apis;
CREATE TRIGGER update_apis_updated_at
    BEFORE UPDATE ON public.apis
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 9. INDEXES (Optional - for better performance)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_apis_user_id ON public.apis(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON public.api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cors_proxies_user_id ON public.cors_proxies(user_id);

-- =============================================
-- DONE! Your database is ready.
-- =============================================
