
CREATE TABLE public.registration_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  account_type text,
  last_step text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  klaviyo_synced_at timestamptz,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX registration_leads_completed_at_idx ON public.registration_leads (completed_at);
GRANT ALL ON public.registration_leads TO service_role;
ALTER TABLE public.registration_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access on registration_leads"
  ON public.registration_leads FOR ALL
  USING (false) WITH CHECK (false);
CREATE TRIGGER update_registration_leads_updated_at
  BEFORE UPDATE ON public.registration_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
