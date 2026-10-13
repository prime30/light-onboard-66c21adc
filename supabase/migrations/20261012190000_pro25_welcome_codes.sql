-- $25 pro welcome code: at most one live PRO25 code per Shopify customer.
-- generate-discount reserves a row before calling Shopify; this index makes a
-- concurrent or retried call collide (23505) instead of minting a second code.
-- deactivated_at marks codes turned off by the backfill-welcome-offers
-- rollback tool, so a later mint can issue a fresh code.
ALTER TABLE public.welcome_offer_codes
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS welcome_offer_codes_one_live_pro25
  ON public.welcome_offer_codes (shopify_customer_id)
  WHERE code LIKE 'PRO25-%' AND deactivated_at IS NULL;
