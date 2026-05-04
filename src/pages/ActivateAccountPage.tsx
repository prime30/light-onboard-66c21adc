import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAtom } from "jotai";
import { customerAtom } from "@/contexts/store";
import { useModeContext } from "@/components/registration/context/ModeContext";
import { ActivateAccountForm } from "@/components/registration/ActivateAccountForm";

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const [customer] = useAtom(customerAtom);
  const navigate = useNavigate();
  const { setMode } = useModeContext();

  const token = searchParams.get("token");
  const customerId = searchParams.get("customer_id");
  const activationUrl = searchParams.get("activation_url");

  useEffect(() => {
    setMode("signin");
  }, [setMode]);

  // Redirect already-logged-in users — but ONLY if they were already logged
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

  return <ActivateAccountForm token={token} customerId={customerId} activationUrl={activationUrl} />;
}

export default ActivateAccountPage;
