REVOKE ALL ON public.sign_in_events FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT ON public.sign_in_events TO service_role;
COMMENT ON TABLE public.sign_in_events IS 'Append-only authentication events accessible only through service-role functions. Browser reports are unverified. Never store credentials or tokens.';