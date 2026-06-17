ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS founder_call_high_volume_only boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_founder_call_high_volume_only()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT founder_call_high_volume_only FROM public.app_settings WHERE singleton = true LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_founder_call_high_volume_only() TO anon, authenticated, service_role;