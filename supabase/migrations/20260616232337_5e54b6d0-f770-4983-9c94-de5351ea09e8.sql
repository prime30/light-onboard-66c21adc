ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS founder_call_no_show_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_registration_leads_founder_call_no_show_at
  ON public.registration_leads (founder_call_no_show_at)
  WHERE founder_call_no_show_at IS NOT NULL;