import { useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { useLocation, useNavigate } from "react-router";
import { customerAtom } from "@/contexts/store";
import { useGlobalApp } from "@/contexts";
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  StoredSession,
} from "@/lib/standalone-session";

// Routes where we should bounce a standalone-logged-in customer to the
// "already logged in" screen, mirroring the iframe behavior in messages.ts.
const REDIRECT_FROM_ROUTES = new Set(["/auth", "/login", "/reset-password", "/activate-account"]);

/**
 * Hydrates `customerAtom` from localStorage on boot (standalone mode only)
 * and exposes helpers to update / clear that session. Iframe mode is owned
 * by the parent theme via CUSTOMER_DATA postMessage and is left untouched.
 */
export function useStandaloneSession() {
  const { isInIframe } = useGlobalApp();
  const [customer, setCustomer] = useAtom(customerAtom);
  const navigate = useNavigate();
  const location = useLocation();

  // Boot hydration: read once, write to atom.
  useEffect(() => {
    if (isInIframe) return;
    const stored = loadStoredSession();
    if (!stored) return;
    setCustomer({
      isLoggedIn: true,
      accessToken: stored.accessToken,
      expiresAt: stored.expiresAt,
      email: stored.email ?? null,
      firstName: stored.firstName ?? null,
    });
  }, [isInIframe, setCustomer]);

  // Standalone redirect: if the user is signed in and lands on an auth route,
  // mirror the iframe behavior and bounce them to /already-logged-in.
  useEffect(() => {
    if (isInIframe) return;
    if (!customer.isLoggedIn) return;
    if (REDIRECT_FROM_ROUTES.has(location.pathname)) {
      navigate("/already-logged-in", { replace: true });
    }
  }, [isInIframe, customer.isLoggedIn, location.pathname, navigate]);

  const setSession = useCallback(
    (session: StoredSession) => {
      saveStoredSession(session);
      setCustomer({
        isLoggedIn: true,
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
        email: session.email ?? null,
        firstName: session.firstName ?? null,
      });
    },
    [setCustomer]
  );

  const signOut = useCallback(() => {
    clearStoredSession();
    setCustomer({
      isLoggedIn: false,
      accessToken: null,
      expiresAt: null,
      email: null,
      firstName: null,
    });
  }, [setCustomer]);

  return { customer, setSession, signOut, isInIframe };
}
