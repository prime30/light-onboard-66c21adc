import { useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAtom } from "jotai";
import { customerAtom } from "@/contexts/store";
import { useModeContext } from "@/components/registration/context/ModeContext";
import { ActivateAccountForm } from "@/components/registration/ActivateAccountForm";
import { setResetEmailHint } from "@/lib/reset-email-hint";
import { resolveResetParams } from "@/lib/reset-params";

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const [customer] = useAtom(customerAtom);
  const navigate = useNavigate();
  const { setMode } = useModeContext();

  // Invite emails carry the recipient as ?email_hint= on the storefront root;
  // the theme overlay forwards it to the iframe as ?email=. Accept both so the
  // recovery form is prefilled even when the user opens the email on a
  // different device than the one that registered (no sessionStorage there).
  //
  // Params are resolved against a durable stash so a reload or an in-app
  // browser session reset does not turn a valid link into a dead end.
  const resolved = useMemo(
    () =>
      resolveResetParams(
        {
          activationUrl: searchParams.get("activation_url"),
          token: searchParams.get("token"),
          customerId: searchParams.get("customer_id"),
          emailHint: searchParams.get("email_hint") || searchParams.get("email"),
        },
        { kind: "activation", fresh: searchParams.has("fresh") }
      ),
    [searchParams]
  );

  const { token, customerId, activationUrl, emailHint } = resolved;

  useEffect(() => {
    setMode("signin");
  }, [setMode]);

  useEffect(() => {
    if (emailHint) setResetEmailHint(emailHint);
  }, [emailHint]);


  // Redirect already-logged-in users - but ONLY if they were already logged
  // in when this page mounted. Otherwise activation's own auto-login flow
  // would flip customer.isLoggedIn mid-flow and trigger a second success
  // screen on /already-logged-in, stacked on top of the form's own success
  // state. The form handles its own post-success UX (auto-close in iframe).
  const wasLoggedInOnMount = useRef(customer.isLoggedIn);
  useEffect(() => {
    if (wasLoggedInOnMount.current && customer.isLoggedIn) {
      navigate("/already-logged-in");
    }
  }, [customer.isLoggedIn, navigate]);

  return (
    <ActivateAccountForm
      token={token ?? null}
      customerId={customerId ?? null}
      activationUrl={activationUrl ?? null}
    />
  );

}

export default ActivateAccountPage;
