-- Payments: deny all write operations to anon/authenticated (server uses service role which bypasses RLS)
CREATE POLICY "No public insert to payments"
  ON public.payments FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No public update to payments"
  ON public.payments FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No public delete from payments"
  ON public.payments FOR DELETE TO anon, authenticated
  USING (false);

-- Submissions: explicit deny on select/update/delete
CREATE POLICY "No public select from submissions"
  ON public.submissions FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY "No public update to submissions"
  ON public.submissions FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No public delete from submissions"
  ON public.submissions FOR DELETE TO anon, authenticated
  USING (false);
