DROP POLICY IF EXISTS "Anon can log not-stylist click" ON public.not_stylist_events;

CREATE POLICY "Anon can log not-stylist click"
  ON public.not_stylist_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (device_type IS NULL OR device_type IN ('mobile','tablet','desktop','unknown'))
    AND (viewport_width IS NULL OR (viewport_width BETWEEN 0 AND 10000))
    AND (viewport_height IS NULL OR (viewport_height BETWEEN 0 AND 10000))
  );