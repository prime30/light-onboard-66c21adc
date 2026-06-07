DROP POLICY IF EXISTS "Public can read auto approval setting" ON public.app_settings;

CREATE OR REPLACE FUNCTION public.get_auto_approval_enabled()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT auto_approval_enabled FROM public.app_settings WHERE singleton = true LIMIT 1),
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_welcome_offer_enabled()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT welcome_offer_enabled FROM public.app_settings WHERE singleton = true LIMIT 1),
    false
  );
$function$;