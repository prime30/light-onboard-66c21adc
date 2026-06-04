
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS welcome_offer_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_welcome_offer_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT welcome_offer_enabled FROM public.app_settings WHERE singleton = true LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_welcome_offer_enabled() TO anon, authenticated;
