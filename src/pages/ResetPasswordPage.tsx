import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAtom } from "jotai";
import { customerAtom } from "@/contexts/store";
import { useModeContext } from "@/components/registration/context/ModeContext";
import { ResetPasswordForm } from "@/components/registration/ResetPasswordForm";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [customer] = useAtom(customerAtom);
  const navigate = useNavigate();
  const { setMode } = useModeContext();

  const token = searchParams.get("token");
  const customerId = searchParams.get("customer_id");
  const resetUrl = searchParams.get("reset_url");
  const emailHint = searchParams.get("email") || searchParams.get("customer_email");

  useEffect(() => {
    setMode("signin");
  }, [setMode]);

  // Redirect already-logged-in users
  useEffect(() => {
    if (customer.isLoggedIn) {
      navigate("/already-logged-in");
    }
  }, [customer.isLoggedIn, navigate]);

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
