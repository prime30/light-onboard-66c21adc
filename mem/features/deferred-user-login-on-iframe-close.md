---
name: Deferred USER_LOGIN on iframe close
description: USER_LOGIN postMessage fired immediately on success AND re-flushed on closeIframe() as safety net for parent-side races
type: feature
---
After a successful registration, password reset, or account activation
inside the iframe, the SPA does both:

1. **Immediate fire**: `sendMessage("USER_LOGIN", { email, password })` at
   the moment the success screen renders so the parent Shopify theme can
   reload in the background while our success scrim stays on top.
2. **Queue for flush**: `setPendingLogin({ email, password })` stores the
   same credentials in `src/lib/pending-login.ts` (module-level singleton).

When the user clicks Close, `useCloseIframe()` calls `takePendingLogin()`
and re-posts USER_LOGIN to the parent **before** posting CLOSE_IFRAME.
This is a safety net for races where the parent dropped/ignored the first
message (e.g. handler not yet bound, route gating, transient).

Files:
- `src/lib/pending-login.ts` — set/take/clear
- `src/hooks/messages.ts` — `useCloseIframe()` flushes before close
- `src/components/registration/context/FormDataContext.tsx` — queues on registration success
- `src/components/registration/ResetPasswordForm.tsx` — queues on reset success (iframe path)
- `src/components/registration/ActivateAccountForm.tsx` — queues on activate success (iframe path)

The parent theme's USER_LOGIN handler must NOT be route-gated (treat the
message as the trigger, regardless of which SPA route is mounted).
