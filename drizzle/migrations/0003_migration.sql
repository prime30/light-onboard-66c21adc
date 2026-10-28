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
  -- One email per reset: only the first refusal after it.
  IF EXISTS (SELECT 1 FROM public.sign_in_events WHERE email = NEW.email AND id <> NEW.id AND created_at >= reset_at AND created_at <= NEW.created_at
     AND (outcome = 'invalid_credentials' OR (source = 'browser_report' AND outcome = 'error' AND code = 'rejected'))) THEN RETURN NEW; END IF;
  BEGIN
    PERFORM net.http_post(
      url := 'https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/notify-error',
      headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzdW5maWV4dHp6ZHhuc3lya2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjYzNzgsImV4cCI6MjA4MTQwMjM3OH0.HD46wzT9yxhixK0V9KU7irXi_Zls924QuIrqQSzPjS4"}'::jsonb,
      body := jsonb_build_object('source', 'post-reset-refusal',
        'message', 'Sign-in refused right after a successful password reset: ' || NEW.email,
        'context', jsonb_build_object('email', NEW.email, 'resetAt', reset_at, 'refusedAt', NEW.created_at, 'via', NEW.source, 'code', NEW.code)));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.alert_post_reset_refusal() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sign_in_events_post_reset_alert ON public.sign_in_events;
CREATE TRIGGER sign_in_events_post_reset_alert AFTER INSERT ON public.sign_in_events
FOR EACH ROW EXECUTE FUNCTION public.alert_post_reset_refusal();