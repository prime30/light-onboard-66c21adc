UPDATE public.registration_leads l
SET completed_at = s.created_at
FROM (
  SELECT DISTINCT ON (email) email, created_at
  FROM public.registration_submissions
  WHERE status IN ('succeeded','shopify_ok')
  ORDER BY email, created_at DESC
) s
WHERE l.email = s.email AND l.completed_at IS NULL;