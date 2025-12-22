/**
 * AuthPage - Wrapper component that provides RegistrationContext
 *
 * This component wraps the Auth component with the RegistrationProvider
 * to enable centralized state management for the registration flow.
 */

import { RegistrationProvider } from "@/components/registration/context/RegistrationContext";
import Auth from "./Auth";

const AuthPage = () => {
  return (
    <RegistrationProvider>
      <Auth />
    </RegistrationProvider>
  );
};

export default AuthPage;
