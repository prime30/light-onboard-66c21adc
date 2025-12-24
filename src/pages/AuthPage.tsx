/**
 * AuthPage - Wrapper component that provides RegistrationContext
 *
 * This component wraps the Auth component with the RegistrationProvider
 * to enable centralized state management for the registration flow.
 */

import { RegistrationProvider } from "@/components/registration/context/RegistrationContext";
import Auth from "./Auth";
import { FormProvider } from "@/components/registration/context/FormContext";

const AuthPage = () => {
  return (
    <FormProvider>
      <RegistrationProvider>
        <Auth />
      </RegistrationProvider>
    </FormProvider>
  );
};

export default AuthPage;
