UPDATE public.app_settings SET welcome_offer_step_enabled = true, business_location_step_enabled = true, updated_at = now() WHERE singleton = true;
ALTER TABLE public.app_settings ALTER COLUMN welcome_offer_step_enabled SET DEFAULT true;
ALTER TABLE public.app_settings ALTER COLUMN business_location_step_enabled SET DEFAULT true;