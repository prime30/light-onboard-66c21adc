ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS preferred_method_step_enabled boolean NOT NULL DEFAULT true;