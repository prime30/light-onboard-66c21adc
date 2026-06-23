
-- 1) Make the deny-all on error_alerts explicit instead of relying on RLS-with-no-policies.
DROP POLICY IF EXISTS "Deny all access to error_alerts" ON public.error_alerts;
CREATE POLICY "Deny all access to error_alerts"
  ON public.error_alerts
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- 2) Tighten storage policies on registration-documents so authenticated users can only
--    touch folders whose name is a 36-char UUID (auth.uid()::text), explicitly excluding
--    the 16-char hex prefix used by anonymous applicant uploads. The first folder must
--    already equal auth.uid()::text (always a UUID), but we add a structural regex check
--    so the separation from anonymous paths is documented, not just probabilistic.

DROP POLICY IF EXISTS "Users can read their own files in registration-documents" ON storage.objects;
CREATE POLICY "Users can read their own files in registration-documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'registration-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

DROP POLICY IF EXISTS "Users can upload to their own folder in registration-documents" ON storage.objects;
CREATE POLICY "Users can upload to their own folder in registration-documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'registration-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

DROP POLICY IF EXISTS "Users can update their own files in registration-documents" ON storage.objects;
CREATE POLICY "Users can update their own files in registration-documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'registration-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

DROP POLICY IF EXISTS "Users can delete their own files in registration-documents" ON storage.objects;
CREATE POLICY "Users can delete their own files in registration-documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'registration-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
