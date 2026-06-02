CREATE OR REPLACE FUNCTION public.get_auto_approval_enabled()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT auto_approval_enabled FROM public.app_settings WHERE singleton = true LIMIT 1),
    false
  );
$function$;

GRANT EXECUTE ON FUNCTION public.get_auto_approval_enabled() TO anon, authenticated;
GRANT SELECT (singleton, auto_approval_enabled) ON public.app_settings TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read auto approval setting" ON public.app_settings;
CREATE POLICY "Public can read auto approval setting"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (singleton = true);