ALTER TABLE public.registration_leads ADD COLUMN IF NOT EXISTS country_code text;
CREATE INDEX IF NOT EXISTS registration_leads_country_code_idx ON public.registration_leads(country_code);