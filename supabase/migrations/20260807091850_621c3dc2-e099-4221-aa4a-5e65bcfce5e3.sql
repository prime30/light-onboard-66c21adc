UPDATE public.app_settings
SET business_location_step_enabled = true,
    updated_by = 'agent: enable business location step'
WHERE singleton = true;