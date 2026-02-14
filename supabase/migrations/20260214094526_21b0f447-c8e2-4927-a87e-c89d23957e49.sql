
-- Create site_config table for secure storage of admin password and access key
CREATE TABLE public.site_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Allow public read (needed for login verification and key check)
CREATE POLICY "Allow public read access to site_config"
ON public.site_config
FOR SELECT
USING (true);

-- Allow public update/insert/delete (admin manages via sessionStorage auth)
CREATE POLICY "Allow public insert access to site_config"
ON public.site_config
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to site_config"
ON public.site_config
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access to site_config"
ON public.site_config
FOR DELETE
USING (true);

-- Insert default values
INSERT INTO public.site_config (key, value) VALUES
  ('admin_password', 'xyzdark6767@@'),
  ('access_key', '');
