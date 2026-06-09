ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS discount_metafields_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_discount_metafields_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT discount_metafields_enabled FROM public.app_settings WHERE singleton = true LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_discount_metafields_enabled() TO anon, authenticated, service_role;