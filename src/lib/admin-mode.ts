import { useEffect, useState } from "react";

const KEY = "dd_admin_mode";
const EVENT = "dd_admin_mode_change";

export function setAdminMode(enabled: boolean) {
  try {
    if (enabled) {
      sessionStorage.setItem(KEY, "1");
    } else {
      sessionStorage.removeItem(KEY);
    }
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
}

export function isAdminMode(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** React hook that reflects whether the current session is in admin mode. */
export function useAdminMode(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => isAdminMode());

  useEffect(() => {
    const update = () => setEnabled(isAdminMode());
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return enabled;
}
