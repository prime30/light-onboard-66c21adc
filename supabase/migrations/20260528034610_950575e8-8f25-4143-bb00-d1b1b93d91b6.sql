ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscribe_sms_promotions BOOLEAN DEFAULT false;

CREATE TABLE public.marketing_consent_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  phone_e164 TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  granted BOOLEAN NOT NULL,
  opt_in_level TEXT NOT NULL DEFAULT 'single_opt_in',
  disclosure_text TEXT NOT NULL,
  source_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketing_consent_log TO authenticated;
GRANT ALL ON public.marketing_consent_log TO service_role;

ALTER TABLE public.marketing_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consent records"
ON public.marketing_consent_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_marketing_consent_log_user_channel
  ON public.marketing_consent_log (user_id, channel, created_at DESC);