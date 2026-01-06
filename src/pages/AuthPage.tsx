/**
 * AuthPage - Wrapper component that provides RegistrationContext
 *
 * This component wraps the Auth component with the RegistrationProvider
 * to enable centralized state management for the registration flow.
 */

import Auth from "./Auth";
import { FormProvider } from "@/components/registration/context/FormContext";

const AuthPage = () => {
  return (
    <FormProvider>
      <Auth />
    </FormProvider>
  );
};

export default AuthPage;
