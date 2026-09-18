SELECT cron.unschedule('nightly-orders-sync')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-orders-sync');

SELECT cron.schedule(
  'nightly-orders-sync',
  '0 6 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://qsunfiextzzdxnsyrkkc.supabase.co/functions/v1/nightly-orders-sync',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzdW5maWV4dHp6ZHhuc3lya2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjYzNzgsImV4cCI6MjA4MTQwMjM3OH0.HD46wzT9yxhixK0V9KU7irXi_Zls924QuIrqQSzPjS4"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);