ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS attribution_referrer text,
  ADD COLUMN IF NOT EXISTS attribution_landing_url text;