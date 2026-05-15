-- Storage RLS for authenticated dashboard uploads into registration-documents
-- Files must live under a top-level folder equal to the user's auth.uid()

CREATE POLICY "Users can upload to their own folder in registration-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'registration-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own files in registration-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'registration-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own files in registration-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'registration-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own files in registration-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'registration-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);