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

-- Public app, no auth. Allow inserts from anyone.
CREATE POLICY "Anyone can insert submissions"
ON public.submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Disallow public select to avoid leaking emails between users.
-- (Server functions using service role can still read.)
CREATE INDEX idx_submissions_email ON public.submissions(email);
CREATE INDEX idx_submissions_created_at ON public.submissions(created_at DESC);