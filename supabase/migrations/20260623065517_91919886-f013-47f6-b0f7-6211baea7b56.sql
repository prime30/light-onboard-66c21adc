
CREATE TABLE IF NOT EXISTS public.helium_customers_backfill (
  helium_id TEXT PRIMARY KEY,
  email TEXT,
  shopify_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL,
  raw JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS helium_customers_backfill_created_at_idx
  ON public.helium_customers_backfill (created_at);
CREATE INDEX IF NOT EXISTS helium_customers_backfill_email_idx
  ON public.helium_customers_backfill (lower(email));

GRANT ALL ON public.helium_customers_backfill TO service_role;

ALTER TABLE public.helium_customers_backfill ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to helium_customers_backfill"
  ON public.helium_customers_backfill
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
