REVOKE EXECUTE ON FUNCTION public.get_auto_approval_enabled() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_extra_customer_tags() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;