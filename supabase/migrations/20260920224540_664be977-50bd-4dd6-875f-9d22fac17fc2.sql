SELECT cron.unschedule('nightly-orders-sync') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-orders-sync');
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobid IN (2,3);

SELECT cron.schedule(
  'nightly-orders-sync',
  '0 6 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/nightly-orders-sync'::text,
    body := '{"trigger": "cron"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'reset-health-check',
  '0 15 * * 1',
  $$
  SELECT extensions.http_post(
    url := 'https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/reset-health-check'::text,
    body := '{"trigger": "cron"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);