import { useModeContext } from "@/components/registration/context/ModeContext";
import { useEffect } from "react";

export function LoginPage() {
  const { setMode } = useModeContext();

  useEffect(() => {
    setMode("signin");
  }, [setMode]);

  return <div>Login Page</div>;
}
