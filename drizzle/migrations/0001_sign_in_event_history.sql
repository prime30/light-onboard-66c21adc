CREATE TABLE public.sign_in_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid,
  email text NOT NULL,
  source text NOT NULL,
  outcome text NOT NULL,
  code text,
  password_source text NOT NULL DEFAULT 'unknown',
  evidence text NOT NULL DEFAULT 'unknown',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sign_in_events TO service_role;
ALTER TABLE public.sign_in_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX sign_in_events_email_time_idx ON public.sign_in_events (email, created_at DESC);
CREATE OR REPLACE FUNCTION public.capture_reset_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reset_failure_last_at IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.reset_failure_last_at IS DISTINCT FROM OLD.reset_failure_last_at) AND (NEW.reset_failure_reason LIKE 'reset_%' OR NEW.reset_failure_reason LIKE 'activation_%') THEN
    INSERT INTO public.sign_in_events (email, source, outcome, code, user_agent)
    VALUES (lower(trim(NEW.email)), 'password_flow', NEW.reset_failure_reason, NEW.reset_failure_code, NEW.reset_failure_user_agent);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_reset_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER capture_reset_history AFTER INSERT OR UPDATE ON public.registration_leads FOR EACH ROW EXECUTE FUNCTION public.capture_reset_history();
COMMENT ON TABLE public.sign_in_events IS 'Append-only authentication events. Client reports are unverified. No credentials or tokens. History starts at creation; prior overwritten attempts cannot be reconstructed.';