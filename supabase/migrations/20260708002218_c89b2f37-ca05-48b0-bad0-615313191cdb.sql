CREATE TABLE IF NOT EXISTS public.not_stylist_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  device_type text,
  viewport_width integer,
  viewport_height integer
);

GRANT INSERT ON public.not_stylist_events TO anon, authenticated;
GRANT ALL ON public.not_stylist_events TO service_role;

ALTER TABLE public.not_stylist_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can log not-stylist click"
  ON public.not_stylist_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS not_stylist_events_created_at_idx
  ON public.not_stylist_events (created_at DESC);