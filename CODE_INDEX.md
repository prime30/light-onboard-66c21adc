# Code Index

> Quick-reference map for AI agents. Read this before grepping.
> For symbol-level lookups (every component, hook, function with `path:line`, plus the import graph), see the generated `.cursor/codebase-index.md`. Regenerate it with `node "$env:USERPROFILE\.cursor\scripts\generate-codebase-index.js" .` when it looks stale.

## Architecture Overview

**App type**: Multi-step registration / auth modal for a Shopify store, embedded via iframe (and served first-party through the Shopify App Proxy at `/apps/apply`).
**Stack**: React 18 + Vite 5 + Tailwind v3 + TypeScript 5. Backend via Supabase Edge Functions (Lovable Cloud).
**Routing**: `react-router-dom` v6, routes defined in `src/App.tsx`. Auth routes nest inside `RegistrationLayout`. Basename is detected at runtime (`src/lib/router-basename.ts`).

---

## Directory Map

### `src/pages/` - Route entry points
| File | Route | Purpose |
|------|-------|---------|
| `Auth.tsx` | `/auth` | Main registration wizard (multi-step form) |
| `AuthPage.tsx` | wrapper | Provides form + step context around Auth |
| `LoginPage.tsx` | `/login` | Sign-in form (lazy loaded) |
| `AlreadyLoggedInPage.tsx` | `/already-logged-in` | Landing for customers who are already logged in |
| `ResetPasswordPage.tsx` | `/reset-password` | Shopify password reset flow |
| `ActivateAccountPage.tsx` | `/activate-account` | Shopify account activation flow |
| `NotEligiblePage.tsx` | `/not-eligible` | Shown when the customer gate rejects an applicant |
| `Reviews.tsx` | `/reviews` | Reviews page (Klaviyo reviews) |
| `BlogResaleLicense.tsx` | `/blog/resale-license` | Static blog page |
| `SsoPreviewPage.tsx` | `/sso-preview` | Preview of the Circle/Syndicate SSO handoff |
| `AdminSettingsPage.tsx` | `/admin/settings` | Admin panel (settings + analytics panels) |
| `OAuthConsentPage.tsx` | `/.lovable/oauth/consent` | OAuth consent screen for the Lovable MCP server |
| `Index.tsx` | `/` | Root redirect |
| `NotFound.tsx` | `*` | 404 |

### `src/components/registration/` - Core registration UI
| File | Purpose |
|------|---------|
| `RegistrationLayout.tsx` | Shared layout: LeftPanel + RightPanel + Outlet |
| `LeftPanel.tsx` | Dark left column with carousel, features, progress |
| `AuthToggle.tsx` | Apply / Login tab switcher |
| `AuthFooter.tsx` | Bottom nav (back/next buttons) |
| `StepIndicatorBar.tsx` | Step progress dots in header |
| `CloseButton.tsx` | Close modal button |
| `FadeText.tsx` | Thin wrapper for semantic tags (forwardRef) |
| `AuthBootFallback.tsx` | Suspense fallback - right panel skeleton only |
| `FormSkeleton.tsx` | Per-step loading skeletons (variant-based) |
| `TextSkeleton.tsx` | Inline shimmer placeholder |
| `FileUpload.tsx` | Single file upload with preview |
| `MultiFileUpload.tsx` | Multi-file upload with thumbnails |
| `FilePreviewThumbnail.tsx` | Image thumbnail for uploads |
| `FileSummary.tsx` | File metadata display |
| `MobileDragHandle.tsx` | Bottom sheet drag affordance |
| `MobileSavingProgress.tsx` | Mobile save indicator |
| `StepValidationIcon.tsx` | Check/error icon per step |
| `ActivateAccountForm.tsx` | Account activation form (signs in via theme on success) |
| `ResetPasswordForm.tsx` | Password reset form (signs in via theme on success) |
| `ActivationRecovery.tsx` | Self-service setup-link recovery when activation fails |
| `AuGeoVerificationGate.tsx` | Blocks the Australia path until AU location is verified |
| `HoneypotField.tsx` | Hidden spam-trap field |
| `InAppBrowserNotice.tsx` | Warning shown inside Instagram/TikTok/etc. webviews |
| `AdminJumpButton.tsx` | Admin-mode shortcut to jump between steps |
| `legal-content.tsx` | Terms / privacy copy |

### `src/components/registration/steps/` - Form steps (rendered inside Auth.tsx)
| File | Step |
|------|------|
| `OnboardingForm.tsx` | Landing / get-started screen |
| `AccountTypeForm.tsx` | Licensed pro / student / school |
| `ContactBasicsStep.tsx` | Name, email, phone, license number |
| `SchoolInfoStep.tsx` | School name/state + enrollment proof |
| `BusinessLocationStep.tsx` | Business address |
| `BusinessOperationStep.tsx` | Salon type selection |
| `MonthlyOrderVolumeStep.tsx` | Expected monthly order volume |
| `PreferredMethodStep.tsx` | Required multi-select pills (tags Shopify customer for Klaviyo) |
| `PreferencesStep.tsx` | Birthday, social handle |
| `TaxExemptionStep.tsx` | Tax exempt document |
| `SummaryForm.tsx` | Review all info before submit |
| `AssessingStep.tsx` | Faux "assessing" progress when auto-approval is on |
| `CreatePasswordStep.tsx` | Password, after summary (auto-approval late password flow) |
| `ScheduleStep.tsx` | Founder call booking (Calendly) |
| `ScheduleConfirmedStep.tsx` | Founder call confirmation |
| `WelcomeOfferStep.tsx` | Welcome offer / discount |
| `SuccessForm.tsx` | Post-submission confirmation |
| `SignInForm.tsx` | Login form |

### `src/components/registration/helpers/` - Left panel sub-components
| File | Purpose |
|------|---------|
| `AnimatedCounters.tsx` | OdometerCounter + RotatingStylistAvatars |
| `RotatingStylistAvatarsLight.tsx` | Light-background avatar variant |
| `CircularProgress.tsx` | Radial progress ring (top-right of left panel) |
| `MagneticFeatureBox.tsx` | Hover-magnetic feature pills |
| `MarqueeBadges.tsx` | Scrolling badge strip (exported from `helpers/index.ts`, no other importers) |
| `TestimonialCarousel.tsx` | Auto-rotating testimonial quotes |

### `src/components/registration/context/` - State management
| File | Purpose |
|------|---------|
| `FormContext.tsx` | react-hook-form provider + field persistence |
| `FormDataContext.tsx` | Cross-step form data (account type, etc.) |
| `ModeContext.tsx` | "signin" vs "signup" mode |
| `StepContext.tsx` | Current step + navigation |
| `RegistrationContext.tsx` | Combined registration state |

### `src/components/admin/` - Admin panel sections (rendered by `AdminSettingsPage.tsx`)
| File | Backing edge function |
|------|---------|
| `SubmissionsLogPanel.tsx` | `admin-list-submissions` |
| `RegistrationAnalyticsPanel.tsx` | `admin-registration-analytics` |
| `RegistrationYoYPanel.tsx` | `admin-registration-yoy` |
| `ReferralAnalyticsPanel.tsx` | `admin-referral-analytics` |
| `AdsAttributionPanel.tsx` | `admin-ads-attribution`, `meta-ads-sync` |
| `FounderCallAnalyticsPanel.tsx` | founder call fields on `registration_leads` |
| `FakeAccountAnalyticsPanel.tsx` | `admin-fake-account-analysis` |
| `CompetitorAttemptsPanel.tsx` / `CompetitorDomainsPanel.tsx` | `admin-competitor-attempts`, competitor domain list |
| `HeliumSpikeInspectorPanel.tsx` | `admin-helium-customers-range` |
| `KlaviyoBackfillPanel.tsx` | `backfill-klaviyo-completion` |
| `ResetHealthPanel.tsx` | reset / invite link health |
| `StorefrontTokensPanel.tsx` | `list-storefront-tokens`, `cleanup-storefront-tokens` |
| `StrandedAccountsPanel.tsx` | `admin-stranded-accounts` |

### `src/hooks/` - Custom hooks
| File | Purpose |
|------|---------|
| `messages.ts` | PostMessage types + `useCustomerLogin`, `useCloseIframe` |
| `use-iframe-comm.ts` | PostMessage communication with Shopify parent |
| `use-theme-login-result.ts` | Waits for the theme's `LOGIN_STATUS` / `CUSTOMER_DATA` reply after `USER_LOGIN` |
| `use-iframe-cart.ts` | Cart actions via the parent theme |
| `use-standalone-session.ts` | Already-logged-in redirect when running outside the iframe |
| `use-api-client.ts` | Fetch wrapper for edge functions |
| `use-address-autocomplete.tsx` | Google Places autocomplete |
| `useGeoCountry.ts` | IP-based country detection (ipwho.is, cached per session) |
| `useAuGeoVerification.ts` | Australia location verification (`verify-au-geo`) |
| `use-bounce-telemetry.ts` | Registration funnel bounce diagnostics |
| `use-reviews.ts` | Reviews data (`get-reviews`) |
| `use-mobile.tsx` | Responsive breakpoint detection |
| `use-modal-swipe.ts` | Bottom sheet swipe-to-dismiss |
| `use-magnetic.tsx` | Magnetic hover effect for elements |
| `use-countdown.tsx` | Timer for rate-limiting UI |
| `use-font-loaded.tsx` | Font load detection |
| `use-safari-viewport-fix.ts` | iOS viewport height fix |
| `use-scroll.ts` | Scroll position tracking |
| `use-toast.ts` | Toast state (shadcn) |

### `src/lib/` - Utilities
| File | Purpose |
|------|---------|
| `utils.ts` | `cn()` class merger |
| `error-parser.ts` | API error response parsing (tested in `error-parser.test.ts`) |
| `imageCompression.ts` | Client-side image compression before upload |
| `scroll-to-error.ts` | Auto-scroll to first validation error |
| `pending-login.ts` | Queue for `USER_LOGIN` credentials, flushed on iframe close |
| `parent-origin.ts` | Safe target origin for `window.parent.postMessage` |
| `parent-breadcrumb.ts` | Posts `APPLICATION_SUBMITTED` to the theme after registration |
| `sso-context.ts` | Cross-origin SSO context from the theme |
| `standalone-session.ts` | Storefront session helpers when not in the iframe |
| `customer-gate.ts` | Client wrapper for the `customer-gate` function |
| `trusted-shopify-url.ts` | Validates Shopify-issued reset / activation URLs |
| `reset-params.ts` | Durable stash for reset / activation link params |
| `reset-email-hint.ts` | Remembers the email typed in forgot-password flows |
| `device-context.ts` | Device / browser snapshot for failure attribution |
| `in-app-browser.ts` | Detects social in-app webviews |
| `router-basename.ts` | Runtime router basename (iframe, App Proxy, direct) |
| `app-settings.ts` | Boot-time app flags with localStorage warm start |
| `admin-mode.ts` | Admin mode toggle |
| `attribution.ts` | Ad / campaign attribution |
| `meta-tracking.ts` | Meta conversion tracking context |
| `calendly-proxy.ts` | Calendly client (`calendly-slots`, `calendly-book`) |
| `founder-call-eligibility.ts` | Founder call qualification rules |
| `phone-e164.ts` | E.164 phone formatting |
| `step-prefetch.ts` | Warms lazy step assets |
| `admin/support-reply.ts` | Admin support reply helper |
| `mcp/` | Lovable MCP server tools (registration, marketing consent, preferences) |
| `validations/auth-schemas.ts` | Zod schemas for auth forms |
| `validations/password-schemas.ts` | Password validation (min 5 chars) |
| `validations/file-schema.ts` | File upload validation |
| `validations/form-utils.ts` | Shared form validation helpers |
| `validations/disposable-email-domains.ts` | Disposable email blocklist |
| `validations/competitor-email-domains.ts` | Competitor email domain blocklist |

### `src/data/` - Static data
| File | Purpose |
|------|---------|
| `auth-constants.ts` | Carousel slide content + feature pills data |
| `step-order.ts` | Step sequence definitions per account type |
| `qualifications.ts` | Hairdressing qualifications per country |
| `country-codes.ts` | Phone country codes |
| `locations.ts` | US states list |
| `allowed-origins.ts` | Allowed iframe parent origins |

### `src/services/` - API service layer
| File | Purpose |
|------|---------|
| `address.ts` | Address autocomplete + details API calls |
| `file.ts` | File upload to edge function |

### `src/contexts/` - Global providers
| File | Purpose |
|------|---------|
| `GlobalAppProvider.tsx` | QueryClient + Tooltip + Jotai provider |
| `UploadFileProvider.tsx` | File upload state management |
| `store.ts` | Jotai atoms (global state) |

### `src/integrations/supabase/` - Supabase client (Lovable-managed)
| File | Purpose |
|------|---------|
| `client.ts` | Supabase client |
| `types.ts` | Generated database types |
| `previewAuthStorage.ts` | Auth storage for the Lovable preview |

### `supabase/functions/` - Edge functions

Each function inlines its own helpers in `index.ts` (see `mem/index.md`).

**Registration and sign-up**
| Function | Purpose |
|----------|---------|
| `create-customer/` | Creates Shopify customer + Supabase profile; activates server-side when auto-approval is on (Chain C). An enabled Shopify account (found up front, or late when Chain C can't get an activation URL) gets a 409 with Sign in / Reset password actions and never a reset email |
| `track-registration-lead/` | Captures incomplete registrations and syncs to Klaviyo |
| `check-email/` | Email-exists check for ContactBasicsStep |
| `check-phone/` | Phone validity + uniqueness check |
| `verify-au-geo/` | Confirms Australia applicants are in AU |
| `verify-instagram-handle/` | Instagram handle check |
| `upload-file/` | Uploads to Supabase storage |
| `get-image/` | Reads stored images |
| `address-autocomplete/` | Google Places autocomplete proxy |
| `address-details/` | Google Places details proxy |
| `generate-discount/` | Creates a Shopify discount code (called from activation and registration) |
| `public-app-flags/` | Public read of the app_settings flags the SPA needs at boot |

**Sign-in, reset, activation** (pair with the theme contract, see `.cursor/rules/theme-boundary.mdc`)
| Function | Purpose |
|----------|---------|
| `customer-login/` | Storefront password check with throttling; records login outcome reasons |
| `multipass-login/` | Verifies password, mints a Shopify Multipass login URL |
| `reset-password/` | Shopify reset via `customerResetByUrl`; dead links self-heal through `recover-password` and report `freshLink` |
| `recover-password/` | Sends a Shopify reset email (`customerRecover`). One email per address per `RESET_EMAIL_COOLDOWN_SECONDS` (default 600) via `reset_email_sends`; `force` for service-role callers only (PSL-009) |
| `activate-account/` | Shopify account activation + storefront sign-in check |
| `customer-gate/` | Circle/Syndicate SSO eligibility (at least 1 order) |
| `log-reset-landing/` | Logs what arrives on the reset screen |
| `reset-health-check/` | Weekly reset / invite link health check (pg_cron) |
| `list-storefront-tokens/`, `cleanup-storefront-tokens/` | Inspect / prune SPA-minted Storefront tokens (100 token cap) |

**Account pages via Shopify App Proxy** (`dropdeadextensions.com/apps/account/...`)
| Function | Purpose |
|----------|---------|
| `change-password/` | Change password |
| `update-tax-exempt/` | Update tax exempt status |
| `orders/` | Order note updates |

**Founder call (Calendly)**
| Function | Purpose |
|----------|---------|
| `calendly-slots/`, `calendly-book/` | Availability and booking |
| `calendly-webhook/` | No-show / cancellation webhooks |
| `setup-calendly-webhook/` | One-off webhook subscription setup |
| `tag-founder-call-attendees/` | Tags attendees in Shopify |
| `backfill-founder-calls/` | Historical booking backfill |

**Orders and ads data**
| Function | Purpose |
|----------|---------|
| `shopify-orders-webhook/` | Live Shopify order webhook into `shop_orders` |
| `setup-shopify-order-webhooks/` | Registers the order webhooks |
| `nightly-orders-sync/` | Nightly wrapper for `backfill-first-orders` (pg_cron) |
| `backfill-first-orders/` | Stamps first order data on `registration_leads` |
| `meta-ads-sync/` | Daily Meta Ads figures into `meta_ads_daily` |

**Admin panel** (email + `ADMIN_PANEL_PASSWORD` auth)
| Function | Purpose |
|----------|---------|
| `admin-toggle-setting/` | Update app_settings |
| `admin-list-submissions/` | Recent `registration_submissions` rows |
| `admin-registration-analytics/`, `admin-registration-yoy/` | Funnel and year-over-year analytics |
| `admin-referral-analytics/`, `admin-ads-attribution/` | Referral and ad attribution |
| `admin-fake-account-analysis/`, `admin-competitor-attempts/` | Fraud and competitor signals |
| `admin-stranded-accounts/` | Applicants without a usable password; reissue setup emails (forced past the reset cooldown). Action `blocked` (read-only): applicants turned away as "already has an account", classified by Shopify state and tags |
| `admin-revoke-account/` | Reject an account and revoke B2B tags in Shopify |
| `admin-helium-audit/`, `admin-helium-customers-range/`, `admin-backfill-helium-customers/` | Helium Customer Fields audit and backfill |

**One-off backfills and internal**
| Function | Purpose |
|----------|---------|
| `backfill-address-country/`, `backfill-customer-tags/`, `backfill-klaviyo-completion/`, `backfill-welcome-offers/` | Admin-gated data backfills |
| `get-reviews/` | Klaviyo reviews proxy |
| `notify-error/` | Internal error notification |
| `mcp/` | Auto-generated by `@lovable.dev/mcp-js`, do not edit |
| `hello-world/` | Sample function |

### `supabase/lib/` - Legacy shared utilities

Not imported by any edge function. Functions inline their helpers instead; don't add new imports from here.

### `supabase/migrations/` - Database migrations

69 SQL migrations. Whether migrations merged from GitHub get applied is unverified (see `.cursor/rules/lovable-sync-workflow.mdc`).

---

## Key Files by Concern

### Styling
- `src/index.css` - All CSS variables, design tokens, animations, keyframes
- `tailwind.config.ts` - Tailwind theme extensions
- `design-system/` - Portable design system (reference only)

### Boot / Loading
- `index.html` - Static boot skeleton (CSS-only, pre-React)
- `AuthBootFallback.tsx` - React Suspense fallback (right panel only)
- `FormSkeleton.tsx` - Per-step skeletons

### Iframe Communication (contract: `C:\Users\alexm\dawn-migration\docs\contracts\apply-spa-login-handoff.md`)
- `use-iframe-comm.ts` - All postMessage logic
- `messages.ts` - Message type definitions + login / close hooks
- `use-theme-login-result.ts` - Theme login reply handling
- `src/lib/pending-login.ts` - Deferred `USER_LOGIN` queue
- `src/lib/parent-origin.ts`, `allowed-origins.ts` - Security allowlist

### Image Assets
- `src/assets/salon-hero.jpg` - Left panel hero (49KB, 576×1024)
- `src/assets/slide-products.jpg` - Carousel slide 2 (89KB, 1024×1024)
- `src/assets/slide-community.jpg` - Carousel slide 3 (100KB, 1024×1024)
- `src/assets/avatars/` - Stylist avatar thumbnails
