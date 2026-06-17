ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS monthly_order_volume text;

CREATE INDEX IF NOT EXISTS idx_registration_leads_monthly_order_volume
  ON public.registration_leads (monthly_order_volume);