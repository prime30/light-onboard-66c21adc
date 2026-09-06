ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS gated_offer_enabled boolean NOT NULL DEFAULT false;