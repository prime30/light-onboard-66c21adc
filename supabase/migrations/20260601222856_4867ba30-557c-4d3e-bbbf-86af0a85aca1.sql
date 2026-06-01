CREATE TABLE public.welcome_offer_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  shopify_customer_id TEXT,
  shopify_discount_id TEXT,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_welcome_offer_codes_email ON public.welcome_offer_codes (email);
CREATE INDEX idx_welcome_offer_codes_created_at ON public.welcome_offer_codes (created_at DESC);

GRANT ALL ON public.welcome_offer_codes TO service_role;

ALTER TABLE public.welcome_offer_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all reads on welcome_offer_codes"
ON public.welcome_offer_codes
FOR SELECT
USING (false);