ALTER TABLE public.registration_leads
  ADD COLUMN IF NOT EXISTS orders_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_order_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS orders_synced_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.campaign_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  campaign text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  note text,
  updated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (channel, campaign)
);

GRANT ALL ON public.campaign_costs TO service_role;

ALTER TABLE public.campaign_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to campaign_costs"
  ON public.campaign_costs FOR ALL
  USING (false) WITH CHECK (false);

CREATE TRIGGER update_campaign_costs_updated_at
  BEFORE UPDATE ON public.campaign_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();