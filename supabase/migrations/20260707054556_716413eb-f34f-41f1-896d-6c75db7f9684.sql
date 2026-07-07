
-- Revoke EXECUTE on all SECURITY DEFINER helper functions from anon,
-- authenticated, and PUBLIC. Triggers and edge functions (service_role) keep
-- access via the function owner / service role.
REVOKE EXECUTE ON FUNCTION public.get_auto_approval_enabled()           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_welcome_offer_enabled()           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_discount_metafields_enabled()     FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_founder_call_high_volume_only()   FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_extra_customer_tags()             FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_registration_validation_errors(text, text[]) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                     FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()            FROM anon, authenticated, PUBLIC;
