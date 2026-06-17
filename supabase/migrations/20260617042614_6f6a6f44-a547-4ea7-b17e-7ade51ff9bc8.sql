ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS first_order_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_order_value numeric,
  ADD COLUMN IF NOT EXISTS first_order_id text,
  ADD COLUMN IF NOT EXISTS first_order_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS registration_leads_first_order_at_idx
  ON public.registration_leads (first_order_at);