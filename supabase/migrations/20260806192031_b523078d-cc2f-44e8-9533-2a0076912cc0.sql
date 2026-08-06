ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS business_location_step_enabled boolean NOT NULL DEFAULT false;