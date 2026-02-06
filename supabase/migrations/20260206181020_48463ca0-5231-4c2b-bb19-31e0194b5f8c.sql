-- Add residential proxy toggle to apis table
ALTER TABLE public.apis 
ADD COLUMN IF NOT EXISTS residential_proxy_enabled boolean DEFAULT false;