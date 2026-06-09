
ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS founder_call_booked_at timestamptz,
  ADD COLUMN IF NOT EXISTS founder_call_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS founder_call_invitee_uri text;

CREATE INDEX IF NOT EXISTS registration_leads_founder_call_booked_at_idx
  ON public.registration_leads (founder_call_booked_at)
  WHERE founder_call_booked_at IS NOT NULL;
