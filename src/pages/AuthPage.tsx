/**
 * AuthPage - Wrapper component that provides RegistrationContext
 *
 * This component wraps the Auth component with the RegistrationProvider
 * to enable centralized state management for the registration flow.
 */

import { useModeContext } from "@/components/registration/context/ModeContext";
import Auth from "./Auth";
import { FormProvider } from "@/components/registration/context/FormContext";
import { useEffect } from "react";

const AuthPage = () => {
  const { setMode } = useModeContext();

  useEffect(() => {
    setMode("signup");
  }, [setMode]);

  // Prefetch sibling auth-flow chunks during idle time so cross-route
  // navigation (NAVIGATE postMessage or in-app links) is instant — no
  // skeleton → network → paint flash. Fire-and-forget; failures are silent.
  useEffect(() => {
    const prefetch = () => {
      void import("./LoginPage");
      void import("./ResetPasswordPage");
      void import("./ActivateAccountPage");
      void import("./AlreadyLoggedInPage");
      void import("./NotEligiblePage");
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(prefetch, { timeout: 2000 });
      return () => {
        const cancel = (window as unknown as { cancelIdleCallback?: (id: number) => void })
          .cancelIdleCallback;
        cancel?.(id);
      };
    }
    const t = setTimeout(prefetch, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <FormProvider>
      <Auth />
    </FormProvider>
  );
};

export default AuthPage;
