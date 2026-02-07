-- Allow public/anonymous access to apis table for admin panel
-- Since admin uses password-based auth (not Supabase auth), we need to allow unauthenticated access

-- First, drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own APIs" ON public.apis;
DROP POLICY IF EXISTS "Users can insert their own APIs" ON public.apis;
DROP POLICY IF EXISTS "Users can update their own APIs" ON public.apis;
DROP POLICY IF EXISTS "Users can delete their own APIs" ON public.apis;

-- Create open policies for admin panel (password-protected at app level)
CREATE POLICY "Allow public read access to apis" 
ON public.apis 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to apis" 
ON public.apis 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to apis" 
ON public.apis 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to apis" 
ON public.apis 
FOR DELETE 
USING (true);

-- Make user_id nullable since we won't have auth.uid()
ALTER TABLE public.apis ALTER COLUMN user_id DROP NOT NULL;

-- Set default value for user_id to a placeholder UUID for admin APIs
ALTER TABLE public.apis ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;