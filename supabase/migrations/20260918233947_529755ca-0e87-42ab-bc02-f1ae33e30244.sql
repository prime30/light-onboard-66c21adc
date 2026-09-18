CREATE TABLE public.meta_ads_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id text NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text NOT NULL DEFAULT '',
  day date NOT NULL,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  link_clicks bigint NOT NULL DEFAULT 0,
  purchases numeric NOT NULL DEFAULT 0,
  purchase_value numeric NOT NULL DEFAULT 0,
  leads numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_ads_daily_unique UNIQUE (account_id, campaign_id, day)
);

GRANT ALL ON public.meta_ads_daily TO service_role;
ALTER TABLE public.meta_ads_daily ENABLE ROW LEVEL SECURITY;

CREATE INDEX meta_ads_daily_day_idx ON public.meta_ads_daily (day DESC);
CREATE INDEX meta_ads_daily_campaign_idx ON public.meta_ads_daily (lower(campaign_name));