ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS orders_matched_by text;