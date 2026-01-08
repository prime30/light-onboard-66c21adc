import { useModeContext } from "@/components/registration/context/ModeContext";
import { SignInForm } from "@/components/registration/steps";
import { useEffect } from "react";

export function LoginPage() {
  const { setMode } = useModeContext();

  useEffect(() => {
    setMode("signin");
  }, [setMode]);

  return <SignInForm />;
}
