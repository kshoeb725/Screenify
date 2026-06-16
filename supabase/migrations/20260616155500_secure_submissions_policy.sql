-- Drop the insecure public insert policy on public.submissions table.
-- All submissions are inserted server-side via generatePromos server function, 
-- so public client-side INSERT access is not needed.
DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.submissions;
