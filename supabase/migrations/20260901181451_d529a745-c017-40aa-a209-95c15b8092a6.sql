CREATE POLICY "No client access to admin support sends"
ON public.admin_support_sends
FOR SELECT
TO authenticated
USING (false);