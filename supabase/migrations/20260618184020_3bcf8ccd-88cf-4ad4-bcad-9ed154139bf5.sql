CREATE TABLE public.error_alerts (
  alert_key TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  last_message TEXT,
  last_context JSONB,
  occurrence_count INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_notified_at TIMESTAMPTZ
);

GRANT ALL ON public.error_alerts TO service_role;
ALTER TABLE public.error_alerts ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only (edge functions).
