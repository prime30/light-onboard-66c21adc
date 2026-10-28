CREATE OR REPLACE FUNCTION public.describe_user_agent(ua text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN ua IS NULL OR ua = '' THEN 'unknown device' ELSE
    (CASE WHEN ua ILIKE '%iPhone%' THEN 'iPhone' WHEN ua ILIKE '%iPad%' THEN 'iPad' WHEN ua ILIKE '%Android%' THEN 'Android'
          WHEN ua ILIKE '%Windows%' THEN 'Windows' WHEN ua ILIKE '%Macintosh%' THEN 'Mac' ELSE 'other device' END)
    || ', ' ||
    (CASE WHEN ua ILIKE '%Instagram%' THEN 'Instagram in-app browser' WHEN ua ILIKE '%FBAN%' OR ua ILIKE '%FBAV%' THEN 'Facebook in-app browser'
          WHEN ua ILIKE '%TikTok%' OR ua ILIKE '%musical_ly%' THEN 'TikTok in-app browser'
          WHEN ua ILIKE '%Edg/%' THEN 'Edge' WHEN ua ILIKE '%CriOS%' OR ua ILIKE '%Chrome/%' THEN 'Chrome'
          WHEN ua ILIKE '%Firefox%' OR ua ILIKE '%FxiOS%' THEN 'Firefox' WHEN ua ILIKE '%Safari%' THEN 'Safari' ELSE 'unknown browser' END)
  END $$;

CREATE OR REPLACE FUNCTION public.post_reset_send_alert(_email text, _reset_at timestamptz, _refused_at timestamptz, _prefix text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ua text; device text; n int;
BEGIN
  SELECT user_agent INTO ua FROM public.sign_in_events WHERE email = _email AND user_agent IS NOT NULL ORDER BY created_at DESC LIMIT 1;
  device := public.describe_user_agent(ua);
  SELECT count(*) INTO n FROM public.sign_in_events WHERE email = _email AND created_at >= _reset_at
    AND (outcome = 'invalid_credentials' OR (source = 'browser_report' AND outcome = 'error' AND code = 'rejected'));
  BEGIN
    PERFORM net.http_post(
      url := 'https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/notify-error',
      headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzdW5maWV4dHp6ZHhuc3lya2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjYzNzgsImV4cCI6MjA4MTQwMjM3OH0.HD46wzT9yxhixK0V9KU7irXi_Zls924QuIrqQSzPjS4"}'::jsonb,
      body := jsonb_build_object('source', 'post-reset-refusal',
        'message', _prefix || ': ' || _email || '. Last device: ' || device || '. Refusals since reset: ' || n || '.',
        'context', jsonb_build_object('email', _email, 'resetAt', _reset_at, 'refusedAt', _refused_at, 'device', device, 'userAgent', ua, 'refusals', n)));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
REVOKE ALL ON FUNCTION public.post_reset_send_alert(text, timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.alert_post_reset_refusal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reset_at timestamptz;
BEGIN
  IF NOT (NEW.outcome = 'invalid_credentials' OR (NEW.source = 'browser_report' AND NEW.outcome = 'error' AND NEW.code = 'rejected')) THEN RETURN NEW; END IF;
  IF NEW.email ILIKE '%-test@example.com' OR NEW.email ILIKE '%probe%@example.com' THEN RETURN NEW; END IF;
  SELECT max(created_at) INTO reset_at FROM public.sign_in_events
   WHERE email = NEW.email AND outcome = 'reset_succeeded'
     AND created_at <= NEW.created_at AND created_at >= NEW.created_at - interval '15 minutes';
  IF reset_at IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.sign_in_events WHERE email = NEW.email AND id <> NEW.id AND created_at >= reset_at AND created_at <= NEW.created_at
     AND (outcome = 'invalid_credentials' OR (source = 'browser_report' AND outcome = 'error' AND code = 'rejected'))) THEN RETURN NEW; END IF;
  PERFORM public.post_reset_send_alert(NEW.email, reset_at, NEW.created_at, 'Sign-in refused right after a successful password reset');
  RETURN NEW;
END $$;

CREATE TABLE IF NOT EXISTS public.post_reset_followups (
  email text NOT NULL,
  reset_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, reset_at)
);
GRANT ALL ON public.post_reset_followups TO service_role;
ALTER TABLE public.post_reset_followups ENABLE ROW LEVEL SECURITY;

-- Second email: refused within 15 min of a reset, an hour has passed, and no successful sign-in since.
CREATE OR REPLACE FUNCTION public.post_reset_followup_sweep()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; sent int := 0;
BEGIN
  FOR r IN
    SELECT s.email, s.created_at AS reset_at, min(f.created_at) AS refused_at
    FROM public.sign_in_events s
    JOIN public.sign_in_events f ON f.email = s.email AND f.created_at >= s.created_at AND f.created_at <= s.created_at + interval '15 minutes'
      AND (f.outcome = 'invalid_credentials' OR (f.source = 'browser_report' AND f.outcome = 'error' AND f.code = 'rejected'))
    WHERE s.outcome = 'reset_succeeded' AND s.created_at >= now() - interval '1 day'
      AND s.email NOT ILIKE '%-test@example.com' AND s.email NOT ILIKE '%probe%@example.com'
    GROUP BY s.email, s.created_at
  LOOP
    CONTINUE WHEN r.refused_at > now() - interval '1 hour';
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.sign_in_events x WHERE x.email = r.email AND x.created_at > r.refused_at
      AND (x.outcome IN ('password_verified','multipass_issued') OR (x.source = 'browser_report' AND x.outcome = 'confirmed')));
    -- A newer reset gets its own alerts.
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.sign_in_events x WHERE x.email = r.email AND x.outcome = 'reset_succeeded' AND x.created_at > r.reset_at);
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.post_reset_followups p WHERE p.email = r.email AND p.reset_at = r.reset_at);
    INSERT INTO public.post_reset_followups (email, reset_at) VALUES (r.email, r.reset_at) ON CONFLICT DO NOTHING;
    PERFORM public.post_reset_send_alert(r.email, r.reset_at, r.refused_at, 'Still stuck an hour after a refused post-reset sign-in');
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END $$;
REVOKE ALL ON FUNCTION public.post_reset_followup_sweep() FROM PUBLIC, anon, authenticated;