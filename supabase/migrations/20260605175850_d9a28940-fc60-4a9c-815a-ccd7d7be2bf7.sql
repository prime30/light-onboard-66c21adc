
-- Append-only audit log of every registration submission attempt.
-- Written exclusively by the create-customer edge function (service_role).
-- Lets us replay failed Helium/Shopify writes without losing applicant data.

CREATE TABLE public.registration_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  account_type text,
  status text NOT NULL DEFAULT 'pending',
    -- pending | helium_ok | shopify_ok | succeeded | failed
  payload jsonb NOT NULL,
    -- full validated registration payload (snake_cased), file URLs only
  helium_customer_id text,
  shopify_customer_id bigint,
  error_log jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- array of { step, status, message, at } entries
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX registration_submissions_email_idx
  ON public.registration_submissions (lower(email));
CREATE INDEX registration_submissions_status_idx
  ON public.registration_submissions (status)
  WHERE status <> 'succeeded';
CREATE INDEX registration_submissions_created_at_idx
  ON public.registration_submissions (created_at DESC);

-- Service role only — no client access. RLS denies everything else.
GRANT ALL ON public.registration_submissions TO service_role;

ALTER TABLE public.registration_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access on registration_submissions"
  ON public.registration_submissions
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE TRIGGER update_registration_submissions_updated_at
  BEFORE UPDATE ON public.registration_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
