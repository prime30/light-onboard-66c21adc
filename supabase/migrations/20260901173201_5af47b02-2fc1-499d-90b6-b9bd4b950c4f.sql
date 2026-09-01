DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;

SELECT cron.unschedule('weekly-reset-health-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-reset-health-check');

SELECT cron.schedule(
  'weekly-reset-health-check',
  '0 15 * * 1',
  $$
  SELECT extensions.http_post(
    url := 'https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/reset-health-check',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzdW5maWV4dHp6ZHhuc3lya2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjYzNzgsImV4cCI6MjA4MTQwMjM3OH0.HD46wzT9yxhixK0V9KU7irXi_Zls924QuIrqQSzPjS4"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);
