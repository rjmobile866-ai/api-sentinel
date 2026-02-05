-- Create CORS proxies table
CREATE TABLE public.cors_proxies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create APIs table
CREATE TABLE public.apis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    headers JSONB DEFAULT '{}',
    body JSONB DEFAULT '{}',
    query_params JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    proxy_enabled BOOLEAN DEFAULT false,
    force_proxy BOOLEAN DEFAULT true,
    rotation_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create logs table
CREATE TABLE public.api_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    api_id UUID REFERENCES public.apis(id) ON DELETE CASCADE,
    api_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    status_code INTEGER,
    success BOOLEAN NOT NULL,
    response_time INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cors_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- CORS Proxies policies
CREATE POLICY "Users can view their own proxies" ON public.cors_proxies
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proxies" ON public.cors_proxies
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proxies" ON public.cors_proxies
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proxies" ON public.cors_proxies
FOR DELETE USING (auth.uid() = user_id);

-- APIs policies
CREATE POLICY "Users can view their own APIs" ON public.apis
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own APIs" ON public.apis
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own APIs" ON public.apis
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own APIs" ON public.apis
FOR DELETE USING (auth.uid() = user_id);

-- API Logs policies
CREATE POLICY "Users can view their own logs" ON public.api_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs" ON public.api_logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs" ON public.api_logs
FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_logs;

-- Create profiles table for users
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default CORS proxies
INSERT INTO public.cors_proxies (user_id, name, url, is_active, priority) VALUES
('00000000-0000-0000-0000-000000000000', 'AllOrigins', 'https://api.allorigins.win/raw?url=', true, 1),
('00000000-0000-0000-0000-000000000000', 'CORS Anywhere', 'https://cors-anywhere.herokuapp.com/', true, 2),
('00000000-0000-0000-0000-000000000000', 'ThingProxy', 'https://thingproxy.freeboard.io/fetch/', true, 3);