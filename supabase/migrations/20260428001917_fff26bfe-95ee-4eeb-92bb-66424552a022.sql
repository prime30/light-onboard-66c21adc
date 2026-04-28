-- 1. Lock down app_settings: remove public SELECT policy
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

-- Expose only the auto_approval_enabled flag via a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_auto_approval_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT auto_approval_enabled FROM public.app_settings WHERE singleton = true LIMIT 1),
    false
  );
$$;

-- Allow anon and authenticated to call only this function
REVOKE ALL ON FUNCTION public.get_auto_approval_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auto_approval_enabled() TO anon, authenticated;

-- 2. Harden handle_new_user trigger with validation and sanitization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type text;
  v_first_name text;
  v_last_name text;
BEGIN
  v_account_type := NEW.raw_user_meta_data ->> 'account_type';
  IF v_account_type IS NOT NULL
     AND v_account_type NOT IN ('professional', 'salon', 'student', 'licensed_stylist') THEN
    v_account_type := NULL;
  END IF;

  v_first_name := NULLIF(TRIM(SUBSTRING(COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''), 1, 100)), '');
  v_last_name  := NULLIF(TRIM(SUBSTRING(COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''), 1, 100)), '');

  BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, account_type)
    VALUES (NEW.id, NEW.email, v_first_name, v_last_name, v_account_type);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;