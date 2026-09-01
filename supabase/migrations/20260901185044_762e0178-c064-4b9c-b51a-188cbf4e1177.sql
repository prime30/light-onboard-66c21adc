REVOKE EXECUTE ON FUNCTION public.get_competitor_email_domains() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_competitor_block(text, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_competitor_email_domains() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_competitor_block(text, text, text, text, integer, integer) TO service_role;