---
name: Marketing consent TCPA split
description: Email and SMS marketing opt-ins are separate fields with channel-specific TCPA disclosure and consent logging
type: feature
---
Email and SMS marketing consent are tracked separately for TCPA / GDPR compliance.

**Fields:**
- `acceptsMarketing` → email only → Shopify `email_marketing_consent`
- `acceptsSmsMarketing` → SMS only → Shopify `sms_marketing_consent` (requires valid E.164 phone)
- `subscribeOrderUpdates` → Helium metadata only; Shopify sends transactional order emails regardless

**Defaults:** all marketing opt-ins default to `false` (unchecked). Only `subscribeOrderUpdates` defaults to `true`.

**UI rules (`PreferencesStep.tsx`):**
- SMS checkbox is disabled when no phone is on file
- Full TCPA disclosure ("recurring automated… consent not a condition of purchase… Msg & data rates… Reply STOP/HELP") lives INSIDE the SMS checkbox label, not in a footer
- No "Recommended" badge on the SMS checkbox (regulatory risk)

**Edge function (`create-customer`):**
- Email and SMS consent are gated on separate flags
- Each granted channel writes one row to `marketing_consent_log` with disclosure text, IP, UA, source URL, Shopify customer id
- Consent logging is best-effort (non-blocking on failure)

**Table:** `marketing_consent_log` - `user_id` and `shopify_customer_id` both nullable so consent can be recorded at sign-up before a Supabase session exists.
