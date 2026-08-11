ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS summary_step_enabled boolean NOT NULL DEFAULT false;

UPDATE public.app_settings
SET summary_step_enabled = false,
    updated_by = 'agent: default summary step hidden'
WHERE singleton = true;
