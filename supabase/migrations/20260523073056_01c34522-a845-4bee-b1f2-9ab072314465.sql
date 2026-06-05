DROP POLICY "Anyone can insert submissions" ON public.submissions;
CREATE POLICY "No public insert to submissions" ON public.submissions FOR INSERT TO anon, authenticated WITH CHECK (false);