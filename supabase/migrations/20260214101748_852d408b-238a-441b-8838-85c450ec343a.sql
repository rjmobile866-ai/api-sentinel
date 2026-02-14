
CREATE TABLE public.hit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to hit_logs" ON public.hit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read hit_logs" ON public.hit_logs FOR SELECT USING (true);
CREATE POLICY "Allow public delete hit_logs" ON public.hit_logs FOR DELETE USING (true);

CREATE INDEX idx_hit_logs_created_at ON public.hit_logs(created_at DESC);
