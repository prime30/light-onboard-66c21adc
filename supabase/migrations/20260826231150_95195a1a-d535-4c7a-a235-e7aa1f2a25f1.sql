ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS klaviyo_started_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_marketing_consent_at timestamptz;