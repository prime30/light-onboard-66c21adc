# Project Memory

## Core
Light, airy aesthetic (glassmorphism). NO warm/brown tones. Spacing divisible by 5. Form radius 15px.
Fonts: Die Grotesk B primary, Termina Medium (500) secondary (-0.006em letter spacing). All text uses sentence casing.
Stack: React, Supabase backend, Shopify embedded. Hosted on Vercel/Netlify.
Selected states barely visible (`bg-foreground/[0.012]`). Entrance animations are deliberately slow (0.6s).
Form state stored in `sessionStorage`. No default account type — user must explicitly select.
Edge functions MUST inline utility functions/schemas in `index.ts`.
Use `ReturnType<typeof setTimeout>` to avoid NodeJS.Timeout errors.
Support email is **hello@dropdeadextensions.com** (NOT support@…).

## Memories
- [Carousel manual navigation](mem://features/carousel-with-manual-navigation) — Crossfade transition, manual navigation, eager preloading
- [Magnetic hover interactions](mem://design/magnetic-hover-interactions) — Magnetic hover strength 0.12-0.15, cursor remains default
- [Directional step transitions](mem://features/directional-step-transition-animations) — Next slides from right, back slides from left
- [Fullscreen auth modal](mem://features/fullscreen-auth-experience) — 90vw, 32px radius, responsive dark hero panel
- [Conditional multi-step flow](mem://features/conditional-multi-step-flow) — Salon vs Professional step logic
- [Dynamic state icon system](mem://features/dynamic-state-icon-system) — Geographic SVG outlines for US/CA state selection
- [Salon step order](mem://features/salon-step-order) — Step 2 Business Location, Step 3 License Verification
- [B2B Marketplace](mem://features/professional-beauty-marketplace) — Context: B2B beauty product marketplace requiring verification
- [Licensed Stylist account](mem://features/licensed-stylist-account-type) — Commission vs independent stylist flow logic
- [Student account verification](mem://features/student-account-school-verification-step) — Cosmetology school verification step
- [Mobile hero animation](mem://features/mobile-hero-animation-strategy) — Opacity/translateY for hide/show on scroll to prevent iOS bounce reset
- [Wholesale terms acknowledgment](mem://features/wholesale-terms-inline-acknowledgment) — Inline 5s animated countdown message on check
- [Mobile swipe-to-dismiss](mem://features/mobile-modal-swipe-to-dismiss) — Modal swipe down to dismiss with rubber band effect
- [Address autocomplete](mem://features/google-places-address-autocomplete) — Google Places API via Supabase edge functions
- [Mobile viewport UI overlap](mem://constraints/mobile-viewport-browser-ui-overlap) — 100dvh, Visual Viewport API, safe-area-inset for fixed bottom elements
- [Marquee badge desaturation](mem://features/marquee-badge-desaturation-effect) — Badges transition to success green near center
- [Missing fields popover](mem://features/submit-button-missing-fields-popover) — Hovering submit shows incomplete steps/fields
- [Stylist avatars constraints](mem://features/stylist-avatars-rotation-constraints) — No duplicate avatars in rotating display
- [Odometer social proof](mem://features/odometer-counter-social-proof) — Rolling counter with random bursts and green flash
- [Reviews modal experience](mem://features/reviews-page-separate-modal-experience) — Full-page modal for reviews
- [Educational content tax](mem://features/educational-content-integration-tax-exemption) — Inline blog card when tax exemption is declined
- [Odometer dynamic increment](mem://features/odometer-dynamic-monthly-increment) — Monthly math logic for counter base calculation
- [Mobile pull-to-refresh](mem://constraints/mobile-pull-to-refresh-with-internal-scroll) — Disable PTR outside scrollable elements to allow internal form scrolling
- [Form restoration animation](mem://features/form-restoration-with-onboarding-animation) — 4.8s rippling circle loader when resuming
- [Supabase storage documents](mem://features/supabase-storage-registration-documents) — 10MB limit, structured path for uploads
- [Portable design system](mem://design-system/portable-design-system-package) — Use design-system/ package for reuse
- [Shopify Helium logic](mem://integrations/shopify-helium-approval-logic) — Approval via Helium Customer Fields
- [Tokens and standards](mem://design-system/tokens-and-standards) — Radius 15px/10px, spacing mod 5, muted bg
- [Visual aesthetic direction](mem://style/visual-aesthetic-direction) — Light, airy, minimal interactions
- [Typography font family](mem://style/typography-font-family) — Die Grotesk B and Termina usage rules
- [Deployment workflow](mem://architecture/deployment-and-publish-workflow) — Frontend manual, Backend auto
- [Zero blank screen boot](mem://performance/zero-blank-screen-boot-strategy) — CSS-only skeleton before React hydration
- [Font loading FOUC prevention](mem://performance/font-loading-fouc-prevention) — Mount gated on document.fonts.ready + font-display: block
- [Shopify theme loading](mem://integrations/shopify-parent-theme-loading) — Skeleton snippet in theme.liquid
- [Vertical rhythm desktop](mem://design/vertical-rhythm-800px-constraint) — Optimized for 1280x800 via vh and clamp()
- [Auth boot fallback](mem://features/auth-boot-fallback-skeleton) — For lazy routes only, neutral colors
- [Onboarding step indicators](mem://design/onboarding-step-indicators) — Large numeric indicators, not buttons
- [Shopify iframe embed](mem://integrations/shopify-app-embed-iframe) — IFRAME_READY postMessage for boot
- [Toast notification contrast](mem://style/toast-notification-contrast) — High opacity, semantic colors
- [Onboarding login nudge](mem://features/onboarding-login-nudge) — Minimal text link instead of banners
- [Registration lazy loading](mem://performance/registration-step-lazy-loading) — Lazy load 11 steps
- [Shopify auth delegation](mem://integrations/shopify-auth-delegation) — Supabase EFs talk to Shopify Admin API
- [Preferred method step](mem://features/preferred-method-step) — Required multi-select pills tagging Shopify customer for Klaviyo
- [License format validation](mem://features/cosmetology-license-format-validation) — Per-state regex patterns, superRefine on registrationSchema, fallbacks never block
- [Auto-approval late password flow](mem://features/auto-approval-late-password-flow) — Password moves AFTER summary, gated by faux 'assessing' progress when auto-approval is ON
- [Deferred USER_LOGIN on iframe close](mem://features/deferred-user-login-on-iframe-close) — USER_LOGIN postMessage queued at registration success and flushed on closeIframe()
- [Auto-approval Shopify activation](mem://features/auto-approval-shopify-activation) — create-customer EF activates the Shopify customer server-side via account_activation_url when auto_approval_enabled
- [Shopify App Proxy mount](mem://integrations/shopify-app-proxy-mount) — SPA served first-party at dropdeadextensions.com/apps/apply via App Proxy; runtime basename auto-detect
- [IFRAME_READY handoff phases](mem://architecture/iframe-ready-handoff-phases) — Two-stage: head-initial/heartbeat from index.html + double-rAF react-painted from useIframeComm; never use fixed setTimeout
- [Cold start build optimizations](mem://performance/cold-start-build-optimizations) — manualChunks, fetchpriority on entry, Supabase preconnect
- [NAVIGATE postMessage handler](mem://features/navigate-postmessage-handler) — Parent → SPA route changes via postMessage (no iframe reload); fires NAVIGATE_COMPLETE on commit
