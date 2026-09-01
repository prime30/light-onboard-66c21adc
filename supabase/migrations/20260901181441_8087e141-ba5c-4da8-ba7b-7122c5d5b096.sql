CREATE TABLE public.admin_support_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  channel text NOT NULL,
  ok boolean NOT NULL DEFAULT true,
  shopify_state text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_support_sends_email_idx ON public.admin_support_sends (email);
CREATE INDEX admin_support_sends_created_at_idx ON public.admin_support_sends (created_at DESC);

GRANT ALL ON public.admin_support_sends TO service_role;

ALTER TABLE public.admin_support_sends ENABLE ROW LEVEL SECURITY;