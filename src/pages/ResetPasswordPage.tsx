import { useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router";
import { useAtom } from "jotai";
import { customerAtom } from "@/contexts/store";
import { useModeContext } from "@/components/registration/context/ModeContext";
import { ResetPasswordForm } from "@/components/registration/ResetPasswordForm";
import { resolveResetParams } from "@/lib/reset-params";
import { getDeviceContext } from "@/lib/device-context";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [customer] = useAtom(customerAtom);
  const navigate = useNavigate();
  const { setMode } = useModeContext();

  // Reset links are resolved against a durable stash: social in-app browsers
  // (Instagram, Facebook) can drop the params the theme handed over, which
  // used to surface as a bogus "link incomplete" screen.
  const resolved = useMemo(
    () =>
      resolveResetParams(
        {
          token: searchParams.get("token"),
          customerId: searchParams.get("customer_id"),
          resetUrl: searchParams.get("reset_url") || searchParams.get("url"),
          emailHint:
            searchParams.get("email_hint") ||
            searchParams.get("email") ||
            searchParams.get("customer_email"),
        },
        { kind: "reset", fresh: searchParams.has("fresh") }
      ),
    [searchParams]
  );

  const token = resolved.token ?? null;
  const customerId = resolved.customerId ?? null;
  const resetUrl = resolved.resetUrl ?? null;
  const emailHint = resolved.emailHint ?? null;


  useEffect(() => {
    setMode("signin");
  }, [setMode]);

  // Report what actually arrived on this screen. Email clients (Outlook and
  // Gmail link wrappers especially) can truncate or re-encode the reset URL,
  // which previously left no trace unless the customer managed to submit.
  useEffect(() => {
    let cancelled = false;
    const payload = {
      flow: "reset",
      resolved: !!(resetUrl || (token && customerId)),
      href: typeof window !== "undefined" ? window.location.href : null,
      resetUrl,
      emailHint,
      device: getDeviceContext(),
    };
    void fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-reset-landing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      if (cancelled) return;
      // Telemetry only, never block the reset.
    });
    return () => {
      cancelled = true;
    };
    // Intentionally fires once per landing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect already-logged-in users, unless a reset just succeeded and the
  // success screen is intentionally being held while the parent theme logs in.
  useEffect(() => {
    if (customer.isLoggedIn) {
      try {
        if (sessionStorage.getItem("dde_on_success_screen") === "1") {
          return;
        }
      } catch {
        // ignore storage failures
      }
      navigate("/already-logged-in");
    }
  }, [customer.isLoggedIn, navigate]);

  // Shopify account-invite emails carry `customer.account_activation_url`
  // (/account/activate/{id}/{token}), not a reset URL. If the theme forwards
  // one of those here, customerResetByUrl silently fails and the password is
  // never saved. Detect it and hand off to the activation flow instead.
  const activationCandidate = resetUrl || searchParams.get("url") || "";
  if (/\/account\/activate\//i.test(activationCandidate)) {
    const next = new URLSearchParams();
    next.set("activation_url", activationCandidate);
    if (emailHint) next.set("email_hint", emailHint);
    return <Navigate to={`/activate-account?${next.toString()}`} replace />;
  }

  return (
    <ResetPasswordForm
      token={token}
      customerId={customerId}
      resetUrl={resetUrl}
      emailHint={emailHint}
    />
  );
}

export default ResetPasswordPage;
