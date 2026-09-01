ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS competitor_email_domains text[] NOT NULL DEFAULT ARRAY[
    'bellami.com',
    'bellamiprofessional.com',
    'glamseamless.com',
    'kovihair.com',
    'dreamcatchers.com',
    'covetandmane.com',
    'invisiblebeadextensions.com',
    'harperellis.com',
    'mourninghair.com',
    'philocalyhairextensions.com'
  ]::text[];

ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS competitor_block_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competitor_block_last_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS competitor_block_domain text;

CREATE OR REPLACE FUNCTION public.get_competitor_email_domains()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT competitor_email_domains FROM public.app_settings WHERE singleton = true LIMIT 1),
    ARRAY[]::text[]
  );
$function$;

CREATE OR REPLACE FUNCTION public.record_competitor_block(
  _email text,
  _domain text DEFAULT NULL,
  _device_type text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _viewport_width integer DEFAULT NULL,
  _viewport_height integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(_email, '')));
BEGIN
  IF v_email = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.registration_leads AS rl (
    email, competitor_block_count, competitor_block_last_at, competitor_block_domain,
    device_type, user_agent, viewport_width, viewport_height
  ) VALUES (
    v_email, 1, now(), _domain,
    _device_type, _user_agent, _viewport_width, _viewport_height
  )
  ON CONFLICT (email) DO UPDATE SET
    competitor_block_count = coalesce(rl.competitor_block_count, 0) + 1,
    competitor_block_last_at = now(),
    competitor_block_domain = coalesce(_domain, rl.competitor_block_domain),
    updated_at = now();
END;
$function$;