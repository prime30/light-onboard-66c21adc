DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

CREATE POLICY "Deny all reads on app_settings"
ON public.app_settings
FOR SELECT
TO public
USING (false);