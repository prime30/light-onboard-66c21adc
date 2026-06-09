
ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS last_field text,
  ADD COLUMN IF NOT EXISTS validation_errors jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS viewport_width integer,
  ADD COLUMN IF NOT EXISTS viewport_height integer;

CREATE OR REPLACE FUNCTION public.increment_registration_validation_errors(
  _email text,
  _fields text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f text;
  cur jsonb;
BEGIN
  IF _fields IS NULL OR array_length(_fields, 1) IS NULL THEN
    RETURN;
  END IF;
  SELECT validation_errors INTO cur FROM public.registration_leads WHERE email = _email;
  IF cur IS NULL THEN
    cur := '{}'::jsonb;
  END IF;
  FOREACH f IN ARRAY _fields LOOP
    cur := jsonb_set(cur, ARRAY[f], to_jsonb(COALESCE((cur ->> f)::int, 0) + 1), true);
  END LOOP;
  UPDATE public.registration_leads SET validation_errors = cur WHERE email = _email;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_registration_validation_errors(text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_registration_validation_errors(text, text[]) TO service_role;
