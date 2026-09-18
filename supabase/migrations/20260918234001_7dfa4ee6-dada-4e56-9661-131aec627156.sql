CREATE POLICY "meta_ads_daily_no_browser_access"
  ON public.meta_ads_daily
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);