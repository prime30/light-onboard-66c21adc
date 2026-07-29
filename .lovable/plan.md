## SALONTRIAL20 SMS-gated claim on the success screen

Gate the 20% off code behind an SMS opt-in on the success screen. Email is already captured at registration, so the claim is a single SMS step. Marketing checkboxes move off the Preferences step entirely.

### Locked decisions

- **Placement:** success screen only, skipped if the customer is already SMS-subscribed.
- **Decline path:** code is fully gated. No fallback code, no smaller offer.
- **Preferences step:** remove the email + SMS marketing checkboxes.
- **No confetti.** Simple crossfade between states.

### Flow

```text
Success screen loads
  |
  +-- already SMS subscribed? --> unlocked card (code visible)
  |
  +-- not subscribed --> claim card (prompt)
         |
         +-- "Text me and unlock 20% off" --> claim-offer EF --> unlocked card
         |
         +-- "No thanks" --> declined card (no code)
```

### New files

**`src/components/registration/steps/ClaimOfferCard.tsx`**
- Three internal states: `prompt`, `unlocked`, `declined`.
- Full-bleed hero image on the top ~55% of the card, content stacked below on a solid background.
- Phone prefilled from the registration context. If missing or failing E.164 validation, the inline phone editor opens by default so the CTA is immediately actionable.
- Reuses existing `TextInput`, `SelectInput`, `formatPhoneNumber`, country flag, and inline editor patterns.
- Unlocked state: code chip + copy button + "Shop now".

**`supabase/functions/claim-offer/index.ts`**
- JWT-verified POST: writes one `marketing_consent_log` SMS row (disclosure text, IP, UA, source URL, Shopify customer id) and patches Shopify `sms_marketing_consent` via the Admin API.
- Lightweight GET returning `{ smsSubscribed: boolean }` sourced from the Shopify customer record, used for the skip-if-already-opted-in check.
- Decline posts nothing to Shopify.

### Modified files

- **`src/components/registration/steps/SuccessForm.tsx`** - replace the inline SALONTRIAL20 fallback with `<ClaimOfferCard />`. Founder-call branch and toggle logic untouched.
- **`src/components/registration/steps/PreferencesStep.tsx`** - remove the entire "Communication preferences" block (email + SMS checkboxes, SMS confirmation strip, SMS-scoped inline phone editor). Keep tax exemption, referral source, birthday, social handle. Phone editing stays available upstream on Contact Basics.
- **`src/components/registration/context/StepContext.tsx`** - remove the cross-field SMS validation added for the Preferences step.
- **`supabase/functions/create-customer/index.ts`** - default `acceptsMarketing` and `acceptsSmsMarketing` to `false` when the payload omits them. Existing consent-logging block stays; it just will not fire at registration for most users.

### Copy

- Eyebrow: `$299` (strikethrough) + `20% off` pill
- Headline: `Try our extensions with 20% off your first order`
- Body: `We can't send free samples as a premium small business, but SALONTRIAL20 lets you feel the product in hand and see how it holds up before offering it to clients.`
- Consent line (below phone): `By tapping below you agree to receive recurring automated texts (approx. 4/month) from Drop Dead Extensions at the number above. Consent is not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See our Terms and Privacy Policy.`
- Primary CTA: `Text me and unlock 20% off`
- Secondary CTA: `No thanks`
- Unlocked headline: `Your code is ready`
- Decline copy: `Maybe next time. Your account is all set, happy shopping.`

### Visual direction

Light aesthetic, form radius 15px, no warm or brown tones. Slow 0.6s entrance animation. Simple crossfade between the three internal states, no bursts. Reuse `src/assets/slide-community.jpg` as the hero for now.

### Technical notes

- No new secrets. Reuses `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_API_VERSION`.
- Registration writes the Shopify customer with both channels unsubscribed. `claim-offer` is what flips SMS.
- Reuse `use-bounce-telemetry` to track claim-state transitions without a schema change.
- No changes to founder-call gating or discount minting logic itself.

### Out of scope

- Redesigning the founder-call variant of the success screen.
- Changing the code value or discount amount.
- Standalone shop-entry modal.
