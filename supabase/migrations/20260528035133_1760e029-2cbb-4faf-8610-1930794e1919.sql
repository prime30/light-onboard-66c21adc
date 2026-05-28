ALTER TABLE public.marketing_consent_log
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.marketing_consent_log
  ADD COLUMN IF NOT EXISTS shopify_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_marketing_consent_log_shopify_customer
  ON public.marketing_consent_log (shopify_customer_id, channel, created_at DESC);