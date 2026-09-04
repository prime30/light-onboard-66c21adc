-- Recover campaign signals that were only present on the referring storefront URL.
WITH src AS (
  SELECT s.id,
         s.email,
         s.attribution->>'referrer' AS ref
  FROM public.registration_submissions s
  WHERE s.created_at > now() - interval '45 days'
    AND COALESCE(s.attribution->>'channel', 'direct') = 'direct'
    AND (s.attribution->>'referrer') IS NOT NULL
    AND ((s.attribution->>'referrer') ~ 'fbclid=' OR (s.attribution->>'referrer') ~ 'utm_source=')
),
calc AS (
  SELECT id,
         email,
         ref,
         substring(ref from 'utm_source=([^&]+)') AS utm_source,
         substring(ref from 'utm_medium=([^&]+)') AS utm_medium,
         substring(ref from 'utm_campaign=([^&]+)') AS utm_campaign,
         substring(ref from 'fbclid=([^&]+)') AS fbclid
  FROM src
),
final AS (
  SELECT c.*,
         CASE
           WHEN lower(coalesce(utm_source,'')) ~ 'facebook|fb|^ig$|instagram|meta'
                AND (lower(coalesce(utm_medium,'')) IN ('cpc','ppc','paid','paidsocial','paid_social','paid-social','cpm','ads','ad')
                     OR lower(coalesce(utm_campaign,'')) ~ '(^|[_-])ads?([_-]|$)')
             THEN 'meta_ads'
           WHEN lower(coalesce(utm_source,'')) ~ 'facebook|fb|^ig$|instagram|meta' THEN 'organic_social'
           WHEN fbclid IS NOT NULL THEN 'meta_click'
           WHEN utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL THEN 'campaign'
           ELSE 'direct'
         END AS new_channel
  FROM calc c
)
UPDATE public.registration_submissions s
SET attribution = s.attribution
  || jsonb_build_object(
       'channel', f.new_channel,
       'channelLabel', CASE f.new_channel
            WHEN 'meta_ads' THEN 'Meta ads (Facebook / Instagram)'
            WHEN 'organic_social' THEN 'Organic social'
            WHEN 'meta_click' THEN 'Facebook / Instagram link click (not an ad)'
            WHEN 'campaign' THEN 'Tagged campaign'
            ELSE 'Direct / organic' END,
       'isPaidAds', f.new_channel = 'meta_ads',
       'utmSource', f.utm_source,
       'utmMedium', f.utm_medium,
       'utmCampaign', f.utm_campaign,
       'fbclid', f.fbclid,
       'backfilledFromReferrer', true
     )
FROM final f
WHERE s.id = f.id AND f.new_channel <> 'direct';

-- Mirror onto the lead rows so the admin cards agree.
UPDATE public.registration_leads l
SET attribution_channel = s.attribution->>'channel',
    attribution_campaign = COALESCE(s.attribution->>'utmCampaign', s.attribution->>'utmSource')
FROM public.registration_submissions s
WHERE lower(l.email) = lower(s.email)
  AND s.created_at > now() - interval '45 days'
  AND (s.attribution->>'backfilledFromReferrer') = 'true'
  AND COALESCE(l.attribution_channel, 'direct') = 'direct';