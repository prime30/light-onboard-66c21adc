ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS attribution_channel text,
  ADD COLUMN IF NOT EXISTS attribution_campaign text;

CREATE INDEX IF NOT EXISTS registration_leads_attr_channel_idx
  ON public.registration_leads (attribution_channel);