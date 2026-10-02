CREATE OR REPLACE FUNCTION public.match_and_recompute_order(_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o public.shop_orders;
  v_lead_email text;
  v_matched_by text;
  v_count int;
  v_revenue numeric;
  v_last timestamptz;
  v_first timestamptz;
  v_first_value numeric;
  v_first_id text;
  v_existing_first timestamptz;
  v_full_history boolean;
BEGIN
  SELECT * INTO o FROM public.shop_orders WHERE shopify_order_id = _order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'order_not_found');
  END IF;

  SELECT rl.email INTO v_lead_email
  FROM public.registration_leads rl
  WHERE o.email IS NOT NULL AND lower(rl.email) = lower(o.email)
  LIMIT 1;

  IF v_lead_email IS NOT NULL THEN
    v_matched_by := 'email';
  ELSIF o.phone_last10 IS NOT NULL AND length(o.phone_last10) = 10 THEN
    SELECT rs.email INTO v_lead_email
    FROM public.registration_submissions rs
    WHERE right(regexp_replace(coalesce(rs.payload->>'phone_number', ''), '\D', '', 'g'), 10) = o.phone_last10
    ORDER BY rs.created_at ASC
    LIMIT 1;
    IF v_lead_email IS NOT NULL THEN
      v_matched_by := 'phone';
    END IF;
  END IF;

  UPDATE public.shop_orders
     SET matched_email = lower(v_lead_email), matched_by = v_matched_by
   WHERE shopify_order_id = _order_id;

  IF v_lead_email IS NULL THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'no_signup_match');
  END IF;

  v_lead_email := lower(v_lead_email);

  SELECT count(*), coalesce(sum(net_amount), 0), max(order_created_at)
    INTO v_count, v_revenue, v_last
  FROM public.shop_orders
  WHERE matched_email = v_lead_email AND is_test = false AND cancelled_at IS NULL;

  SELECT order_created_at, total_price, shopify_order_id
    INTO v_first, v_first_value, v_first_id
  FROM public.shop_orders
  WHERE matched_email = v_lead_email AND is_test = false AND cancelled_at IS NULL
  ORDER BY order_created_at ASC
  LIMIT 1;

  SELECT first_order_at INTO v_existing_first
  FROM public.registration_leads WHERE email = v_lead_email;

  -- Only trust shop_orders as the full history when it reaches back to the
  -- customer's known first order. Otherwise older orders (from the backfill)
  -- are missing, so keep the existing lifetime totals and let the weekly
  -- reconciliation refresh them.
  v_full_history := v_existing_first IS NULL
    OR (v_first IS NOT NULL AND v_first <= v_existing_first);

  UPDATE public.registration_leads
     SET orders_count = CASE WHEN v_full_history THEN coalesce(v_count, 0) ELSE orders_count END,
         orders_revenue = CASE WHEN v_full_history THEN round(coalesce(v_revenue, 0), 2) ELSE orders_revenue END,
         last_order_at = CASE WHEN v_full_history THEN v_last
                              ELSE greatest(last_order_at, v_last) END,
         orders_synced_at = now(),
         orders_matched_by = coalesce(v_matched_by, orders_matched_by),
         first_order_at = CASE
           WHEN v_first IS NULL THEN first_order_at
           WHEN v_existing_first IS NULL OR v_first < v_existing_first THEN v_first
           ELSE first_order_at END,
         first_order_value = CASE
           WHEN v_first IS NOT NULL AND (v_existing_first IS NULL OR v_first < v_existing_first)
             THEN v_first_value ELSE first_order_value END,
         first_order_id = CASE
           WHEN v_first IS NOT NULL AND (v_existing_first IS NULL OR v_first < v_existing_first)
             THEN v_first_id ELSE first_order_id END,
         first_order_synced_at = now()
   WHERE email = v_lead_email;

  RETURN jsonb_build_object(
    'matched', true,
    'lead_email', v_lead_email,
    'matched_by', v_matched_by,
    'full_history', v_full_history,
    'orders_count', coalesce(v_count, 0),
    'orders_revenue', round(coalesce(v_revenue, 0), 2)
  );
END;
$function$;