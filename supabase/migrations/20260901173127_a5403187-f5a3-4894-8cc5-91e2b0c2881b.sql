ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS reset_failure_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reset_failure_last_at timestamptz,
  ADD COLUMN IF NOT EXISTS reset_failure_reason text,
  ADD COLUMN IF NOT EXISTS reset_failure_code text,
  ADD COLUMN IF NOT EXISTS reset_failure_device_type text,
  ADD COLUMN IF NOT EXISTS reset_failure_in_app_browser text,
  ADD COLUMN IF NOT EXISTS reset_failure_user_agent text;

CREATE INDEX IF NOT EXISTS registration_leads_reset_failure_last_at_idx
  ON public.registration_leads (reset_failure_last_at)
  WHERE reset_failure_last_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_reset_failure(
  _email text,
  _reason text,
  _code text DEFAULT NULL,
  _device_type text DEFAULT NULL,
  _in_app_browser text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _viewport_width integer DEFAULT NULL,
  _viewport_height integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(_email, '')));
BEGIN
  IF v_email = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.registration_leads AS rl (
    email, reset_failure_count, reset_failure_last_at, reset_failure_reason,
    reset_failure_code, reset_failure_device_type, reset_failure_in_app_browser,
    reset_failure_user_agent, device_type, viewport_width, viewport_height, user_agent
  ) VALUES (
    v_email, 1, now(), _reason,
    _code, _device_type, _in_app_browser,
    _user_agent, _device_type, _viewport_width, _viewport_height, _user_agent
  )
  ON CONFLICT (email) DO UPDATE SET
    reset_failure_count = coalesce(rl.reset_failure_count, 0) + 1,
    reset_failure_last_at = now(),
    reset_failure_reason = _reason,
    reset_failure_code = _code,
    reset_failure_device_type = coalesce(_device_type, rl.reset_failure_device_type),
    reset_failure_in_app_browser = coalesce(_in_app_browser, rl.reset_failure_in_app_browser),
    reset_failure_user_agent = coalesce(_user_agent, rl.reset_failure_user_agent),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_reset_failure(text, text, text, text, text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_reset_failure(text, text, text, text, text, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_reset_failure(text, text, text, text, text, text, integer, integer) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('weekly-reset-health-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-reset-health-check');

SELECT cron.schedule(
  'weekly-reset-health-check',
  '0 15 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/reset-health-check',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzdW5maWV4dHp6ZHhuc3lya2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjYzNzgsImV4cCI6MjA4MTQwMjM3OH0.HD46wzT9yxhixK0V9KU7irXi_Zls924QuIrqQSzPjS4"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);
