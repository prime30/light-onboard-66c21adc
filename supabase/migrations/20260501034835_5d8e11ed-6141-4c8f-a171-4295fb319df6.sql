ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS extra_customer_tags text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.get_extra_customer_tags()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT extra_customer_tags FROM public.app_settings WHERE singleton = true LIMIT 1),
    ARRAY[]::text[]
  );
$$;