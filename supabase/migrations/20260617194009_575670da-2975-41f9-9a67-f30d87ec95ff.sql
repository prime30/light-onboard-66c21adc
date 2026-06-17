-- 1) Drop duplicate storage policies on registration-documents
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;

-- 2) Lock down marketing_consent_log writes; service role bypasses RLS
DROP POLICY IF EXISTS "Block client inserts on marketing_consent_log" ON public.marketing_consent_log;
DROP POLICY IF EXISTS "Block client updates on marketing_consent_log" ON public.marketing_consent_log;
DROP POLICY IF EXISTS "Block client deletes on marketing_consent_log" ON public.marketing_consent_log;

CREATE POLICY "Block client inserts on marketing_consent_log"
  ON public.marketing_consent_log
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Block client updates on marketing_consent_log"
  ON public.marketing_consent_log
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Block client deletes on marketing_consent_log"
  ON public.marketing_consent_log
  FOR DELETE
  TO authenticated, anon
  USING (false);