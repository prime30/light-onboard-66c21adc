-- Every reset and activation outcome goes to sign_in_events, not only the
-- reasons prefixed reset_/activation_ (token_rejected, token_expired and the
-- landing checks were silently dropped by capture_reset_history).
-- Login outcomes are skipped here because customer-login and multipass-login
-- write their own sign_in_events rows.
--
-- registration_leads.reset_failure_* holds the latest failure only: successes
-- no longer overwrite it, and unknown emails no longer get a new lead row.

DROP TRIGGER IF EXISTS capture_reset_history ON public.registration_leads;

CREATE OR REPLACE FUNCTION public.record_reset_failure(
  _email text,
  _reason text,
  _code text DEFAULT NULL::text,
  _device_type text DEFAULT NULL::text,
  _in_app_browser text DEFAULT NULL::text,
  _user_agent text DEFAULT NULL::text,
  _viewport_width integer DEFAULT NULL::integer,
  _viewport_height integer DEFAULT NULL::integer
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(_email, '')));
  v_reason text := coalesce(_reason, '');
  v_login boolean := v_reason LIKE 'login\_%' OR v_reason LIKE 'multipass\_%';
  v_success boolean := v_reason IN ('login_ok', 'multipass_ok') OR v_reason LIKE '%succeeded';
BEGIN
  IF v_email = '' THEN
    RETURN;
  END IF;

  IF NOT v_login THEN
    INSERT INTO public.sign_in_events (email, source, outcome, code, user_agent)
    VALUES (v_email, 'password_flow', v_reason, _code, _user_agent);
  END IF;

  IF v_success THEN
    RETURN;
  END IF;

  UPDATE public.registration_leads AS rl SET
    reset_failure_count = coalesce(rl.reset_failure_count, 0) + 1,
    reset_failure_last_at = now(),
    reset_failure_reason = _reason,
    reset_failure_code = _code,
    reset_failure_device_type = coalesce(_device_type, rl.reset_failure_device_type),
    reset_failure_in_app_browser = coalesce(_in_app_browser, rl.reset_failure_in_app_browser),
    reset_failure_user_agent = coalesce(_user_agent, rl.reset_failure_user_agent),
    updated_at = now()
  WHERE lower(trim(rl.email)) = v_email;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_reset_failure(text, text, text, text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_reset_failure(text, text, text, text, text, text, integer, integer) TO service_role;
