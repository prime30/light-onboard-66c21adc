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

  return (
    <FormProvider>
      <Auth />
    </FormProvider>
  );
};

export default AuthPage;
