CREATE TABLE public.shop_orders (
  shopify_order_id text PRIMARY KEY,
  order_number text,
  email text,
  phone_last10 text,
  order_created_at timestamptz NOT NULL,
  total_price numeric NOT NULL DEFAULT 0,
  refunded_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  cancelled_at timestamptz,
  financial_status text,
  is_test boolean NOT NULL DEFAULT false,
  net_amount numeric GENERATED ALWAYS AS (
    CASE WHEN cancelled_at IS NOT NULL THEN 0
         ELSE GREATEST(total_price - refunded_amount, 0) END
  ) STORED,
  matched_email text,
  matched_by text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.shop_orders TO service_role;

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_orders_no_browser_access"
  ON public.shop_orders FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE TRIGGER update_shop_orders_updated_at
  BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX shop_orders_email_idx ON public.shop_orders (lower(email));
CREATE INDEX shop_orders_phone_idx ON public.shop_orders (phone_last10);
CREATE INDEX shop_orders_matched_email_idx ON public.shop_orders (matched_email);
CREATE INDEX shop_orders_received_at_idx ON public.shop_orders (received_at DESC);

CREATE INDEX registration_submissions_phone_last10_idx
  ON public.registration_submissions (
    right(regexp_replace(coalesce(payload->>'phone_number', ''), '\D', '', 'g'), 10)
  );

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
BEGIN
  SELECT * INTO o FROM public.shop_orders WHERE shopify_order_id = _order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'order_not_found');
  END IF;

  -- 1) Match by email on the signup record.
  SELECT rl.email INTO v_lead_email
  FROM public.registration_leads rl
  WHERE o.email IS NOT NULL AND lower(rl.email) = lower(o.email)
  LIMIT 1;

  IF v_lead_email IS NOT NULL THEN
    v_matched_by := 'email';
  ELSIF o.phone_last10 IS NOT NULL AND length(o.phone_last10) = 10 THEN
    -- 2) Fall back to the phone number the applicant gave us.
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

  SELECT count(*) FILTER (WHERE net_amount > 0 OR cancelled_at IS NULL),
         coalesce(sum(net_amount), 0),
         max(order_created_at)
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

  UPDATE public.registration_leads
     SET orders_count = coalesce(v_count, 0),
         orders_revenue = round(coalesce(v_revenue, 0), 2),
         last_order_at = v_last,
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
    'orders_count', coalesce(v_count, 0),
    'orders_revenue', round(coalesce(v_revenue, 0), 2)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.match_and_recompute_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_and_recompute_order(text) TO service_role;