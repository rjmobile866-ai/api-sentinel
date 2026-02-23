
-- User passwords table for IP-locked access
CREATE TABLE public.user_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password text NOT NULL,
  device_ip text DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;

-- Public access policies (admin manages via sessionStorage auth)
CREATE POLICY "Allow public read user_passwords" ON public.user_passwords FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_passwords" ON public.user_passwords FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update user_passwords" ON public.user_passwords FOR UPDATE USING (true);
CREATE POLICY "Allow public delete user_passwords" ON public.user_passwords FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_passwords;
