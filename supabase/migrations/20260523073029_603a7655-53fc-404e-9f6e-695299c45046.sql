CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  app_name TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  objective TEXT NOT NULL,
  screenshot_ref TEXT,
  generated_images JSONB DEFAULT '[]'::jsonb,
  palette JSONB DEFAULT '[]'::jsonb,
  background_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert submissions" ON public.submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX idx_submissions_email ON public.submissions(email);
CREATE INDEX idx_submissions_created_at ON public.submissions(created_at DESC);

CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  lemon_squeezy_order_id TEXT,
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to payments" ON public.payments FOR SELECT USING (false);
CREATE INDEX payments_session_id_idx ON public.payments (session_id);
CREATE INDEX payments_status_idx ON public.payments (status);