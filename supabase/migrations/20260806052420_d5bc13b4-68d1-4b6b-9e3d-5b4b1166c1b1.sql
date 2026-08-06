ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS business_operation_step_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS order_volume_step_enabled boolean NOT NULL DEFAULT true;