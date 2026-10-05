-- One password reset email per address per cooldown window.
-- recover-password claims a slot before asking Shopify to send, and releases
-- it when Shopify did not accept the send. Service role only.
-- Idempotent: safe to apply more than once.

CREATE TABLE IF NOT EXISTS public.reset_email_sends (
  email text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL,
  prev_sent_at timestamptz,
  send_count integer NOT NULL DEFAULT 1,
  last_source text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reset_email_sends ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.reset_email_sends FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reset_email_sends TO service_role;

-- Returns the claim timestamp, or NULL when the address is inside the window.
CREATE OR REPLACE FUNCTION public.claim_reset_send(
  _email text,
  _cooldown_seconds integer,
  _source text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(_email, '')));
  v_at timestamptz;
BEGIN
  IF v_email = '' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.reset_email_sends AS s (email, last_sent_at, send_count, last_source, updated_at)
  VALUES (v_email, now(), 1, _source, now())
  ON CONFLICT (email) DO UPDATE SET
    prev_sent_at = s.last_sent_at,
    last_sent_at = now(),
    send_count = s.send_count + 1,
    last_source = _source,
    updated_at = now()
  WHERE s.last_sent_at < now() - make_interval(secs => greatest(coalesce(_cooldown_seconds, 0), 0))
  RETURNING s.last_sent_at INTO v_at;

  RETURN v_at;
END;
$$;

-- Undo a claim whose send Shopify did not accept. Only touches the row when
-- it still holds this claim; keeps one level of history.
CREATE OR REPLACE FUNCTION public.release_reset_send(
  _email text,
  _claimed_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(_email, '')));
BEGIN
  IF v_email = '' OR _claimed_at IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.reset_email_sends
  WHERE email = v_email AND last_sent_at = _claimed_at AND prev_sent_at IS NULL;

  UPDATE public.reset_email_sends SET
    last_sent_at = prev_sent_at,
    prev_sent_at = NULL,
    send_count = greatest(send_count - 1, 0),
    updated_at = now()
  WHERE email = v_email AND last_sent_at = _claimed_at AND prev_sent_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_reset_send(text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_reset_send(text, integer, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_reset_send(text, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.release_reset_send(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_reset_send(text, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_reset_send(text, timestamptz) TO service_role;