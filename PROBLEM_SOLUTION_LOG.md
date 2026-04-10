# Problem–Solution Log

> Documented bugs and their root causes. Read this before debugging recurring issues.

---

## PSL-001: Competing Skeletons (Double Loading UI)

**Symptom**: Two overlapping loading skeletons visible during route transitions — one from `index.html` boot shell, one from React.

**Root Cause**: `AuthBootFallback` was rendering a full-page skeleton (including its own dark left panel and `100vh` wrapper) but was used as a `<Suspense>` fallback *inside* `RegistrationLayout`, which already renders the real `LeftPanel`. Result: two left panels stacking.

**Fix**: `AuthBootFallback` now renders **only the right-panel content skeleton** (form blocks + footer). A separate `GenericBootFallback` exists for non-layout routes. The boot shell in `index.html` is CSS-only and replaced on React mount.

**Key Rule**: Any Suspense fallback used inside `RegistrationLayout` must NOT include a left panel or full-page wrapper — the layout already provides those.

**Files**: `AuthBootFallback.tsx`, `index.html`, `App.tsx`

---

## PSL-002: Brown/Warm-Toned Skeleton Colors

**Symptom**: Loading skeletons had a noticeable warm brown tint instead of neutral gray.

**Root Cause**: Hardcoded HSL values with warm undertones in multiple places:
- `index.html`: `hsl(36 33% 96%)` backgrounds, `hsl(24 18% 12%)` dark panel
- `AuthBootFallback.tsx`: `hsla(28, 18%, 84%, 0.55)` shimmer gradients

**Fix**: Replaced all warm HSL values with neutral equivalents:
- Backgrounds: `hsl(0 0% 98%)` 
- Dark panel: `hsl(0 0% 12/16/20%)`
- React fallback: uses CSS variables `hsl(var(--muted))` and `hsl(var(--background))`

**Key Rule**: Never hardcode color values in skeleton/loading components. Always use CSS variable tokens from the design system.

**Files**: `index.html`, `AuthBootFallback.tsx`

---

## PSL-003: Left Panel Carousel FOUC / Jank

**Symptom**: Carousel transitions in the left panel showed a flash of unstyled/empty content when changing slides.

**Root Cause (architectural)**: Three compounding issues:
1. **Mount/unmount architecture**: Only the active slide's `<img>` existed in the DOM. On slide change, a new layer was mounted with a CSS `translateX` slide-in animation. The browser had to fetch, decode, and composite a new image during the 600ms transition.
2. **SVG noise filter**: Each slide layer included an inline SVG `feTurbulence` noise texture overlay — expensive to rasterize on every mount.
3. **Text opacity-0 entrance animations**: Carousel text content used `opacity-0 animate-fade-in` with staggered delays, starting invisible then fading in — creating a flash where text was invisible for 100-400ms.

**Fix (architecture change)**:
- **Pre-mounted crossfade**: All three slide `<img>` elements are permanently in the DOM. Active slide gets `opacity-100`, inactive get `opacity-0` via `transition-opacity duration-500`. No mounting/unmounting.
- **Removed SVG noise**: Replaced `feTurbulence` filter with a lightweight CSS radial-gradient texture overlay.
- **Removed text entrance animations**: Text content renders immediately — the background crossfade provides sufficient visual transition.

**Key Rule**: Carousels must pre-mount all slide images and transition via opacity/transform — never mount/unmount slide layers. Avoid SVG filters in animated contexts.

**Files**: `LeftPanel.tsx`, `src/index.css`

---

## PSL-004: FadeText Ref Warning

**Symptom**: React console warning: "Function components cannot be given refs."

**Root Cause**: `FadeText` was a plain function component used in contexts where React tried to attach a ref (e.g., inside animation wrappers).

**Fix**: Wrapped `FadeText` with `React.forwardRef` and added `displayName`.

**Files**: `FadeText.tsx`

---

## PSL-005: Iframe PostMessage Security

**Symptom**: Need to communicate modal state (close, auth success, etc.) to Shopify parent.

**Architecture**: 
- `use-iframe-comm.ts` handles all postMessage communication
- `allowed-origins.ts` whitelist controls which parent origins are accepted
- Message types: `CLOSE_MODAL`, `AUTH_SUCCESS`, `PASSWORD_RESET_SUCCESS`, `ACCOUNT_ACTIVATED`, `TOKEN_EXPIRED`, `NAVIGATE`

**Key Rule**: Always validate `event.origin` against the whitelist. Never send sensitive data via postMessage.

**Files**: `use-iframe-comm.ts`, `messages.ts`, `allowed-origins.ts`

---

## PSL-006: Password Reset / Account Activation Token Handling

**Symptom**: Shopify sends users to `/account/reset/<id>/<token>` and `/account/activate/<id>/<token>` — these need to be intercepted.

**Architecture**: 
- Shopify Liquid templates extract `customer_id` and `token` from the URL path and redirect to this app's `/reset-password` or `/activate-account` routes with query params.
- Edge functions (`reset-password/`, `activate-account/`) proxy the token submission to Shopify's API.
- UI states handled: `form`, `success`, `expired`, `invalid`, `missing-params`, `error`, `rate-limited`.

**Key Rule**: Tokens expire. Always handle the expired/invalid case gracefully with a clear CTA (contact support or request new link).

**Files**: `ResetPasswordPage.tsx`, `ActivateAccountPage.tsx`, `ResetPasswordForm.tsx`, `ActivateAccountForm.tsx`, `supabase/functions/reset-password/`, `supabase/functions/activate-account/`

---

## PSL-007: File Upload Architecture

**Symptom**: Need to upload license documents, enrollment proofs, tax exempt docs.

**Architecture**:
- Client compresses images via `imageCompression.ts` before upload
- `UploadFileProvider.tsx` manages upload state globally
- `file.ts` service calls the `upload-file` edge function
- Edge function stores files in Supabase storage, returns the path
- File paths stored in the `profiles` table columns (`license_document_path`, `enrollment_proof_paths`, `tax_exempt_document_path`)

**Key Rule**: Always compress images client-side before upload. Max dimensions and quality are set in `imageCompression.ts`.

**Files**: `FileUpload.tsx`, `MultiFileUpload.tsx`, `imageCompression.ts`, `UploadFileProvider.tsx`, `file.ts`, `supabase/functions/upload-file/`

---

## PSL-008: Step Navigation & Conditional Steps

**Symptom**: Different account types show different step sequences.

**Architecture**:
- `step-order.ts` defines step sequences per account type (licensed-pro, student, school-admin)
- `StepContext.tsx` manages current step and navigation
- `FormDataContext.tsx` holds cross-step data (account type determines which steps show)
- Steps are rendered inside `Auth.tsx` via a switch on the current step

**Key Rule**: When adding a new step, update `step-order.ts` for each applicable account type AND add the component to the switch in `Auth.tsx`.

**Files**: `step-order.ts`, `StepContext.tsx`, `FormDataContext.tsx`, `Auth.tsx`

---

## Anti-Patterns to Avoid

1. **Never use `opacity-0 animate-fade-in` for initial renders** — causes FOUC. Use it only for elements entering *after* user interaction.
2. **Never mount/unmount heavy visual layers during transitions** — pre-mount and toggle visibility.
3. **Never use SVG `feTurbulence` in animated contexts** — use CSS gradients instead.
4. **Never hardcode HSL color values in components** — use CSS variable tokens.
5. **Never render full-page skeletons inside `RegistrationLayout`** — layout already provides the shell.
6. **Never store roles on the profile table** — use a separate `user_roles` table.
7. **Never edit `src/integrations/supabase/client.ts` or `types.ts`** — auto-generated.
