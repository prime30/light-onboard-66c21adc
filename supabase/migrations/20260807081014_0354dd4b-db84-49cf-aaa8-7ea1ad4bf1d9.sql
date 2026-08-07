ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS referral_step_enabled boolean NOT NULL DEFAULT true;