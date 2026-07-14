UPDATE public.app_settings
SET founder_call_enabled = false,
    updated_at = now()
WHERE singleton = true;

-- Verify the change
SELECT founder_call_enabled, welcome_offer_enabled, founder_call_high_volume_only
FROM public.app_settings
WHERE singleton = true;