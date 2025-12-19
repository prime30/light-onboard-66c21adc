/**
 * useAuth Hook
 * 
 * React hook for managing authentication state and operations.
 * Provides reactive auth state and methods for sign up, sign in, and sign out.
 */

import { useState, useEffect, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  getSession,
  onAuthStateChange,
  type SignUpData,
  type SignInData,
  type AuthResult,
} from "@/lib/auth-service";
import { supabase } from "@/integrations/supabase/client";

interface UseAuthReturn {
  // State
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Auth operations
  signUp: (data: SignUpData) => Promise<AuthResult>;
  signIn: (data: SignInData) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  
  // Refresh
  refreshSession: () => Promise<void>;
}

/**
 * Hook for managing authentication state
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const unsubscribe = onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    // THEN check for existing session
    getSession().then((existingSession) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up wrapper
  const signUp = useCallback(async (data: SignUpData): Promise<AuthResult> => {
    const result = await authSignUp(data);
    return result;
  }, []);

  // Sign in wrapper
  const signIn = useCallback(async (data: SignInData): Promise<AuthResult> => {
    const result = await authSignIn(data);
    return result;
  }, []);

  // Sign out wrapper
  const signOut = useCallback(async (): Promise<AuthResult> => {
    const result = await authSignOut();
    if (result.success) {
      setUser(null);
      setSession(null);
    }
    return result;
  }, []);

  // Reset password wrapper
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    return authResetPassword(email);
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    const newSession = await getSession();
    setSession(newSession);
    setUser(newSession?.user ?? null);
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshSession,
  };
}

/**
 * Hook for checking if user is authenticated
 * Lighter weight than useAuth for simple auth checks
 */
export function useIsAuthenticated(): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    getSession().then((session) => {
      setIsAuthenticated(!!session);
    });

    return unsubscribe;
  }, []);

  return isAuthenticated;
}
