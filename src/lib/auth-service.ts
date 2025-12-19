/**
 * Auth Service
 * 
 * Centralized authentication service for Supabase integration.
 * Handles sign up, sign in, sign out, and password reset.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AuthError, User, Session } from "@supabase/supabase-js";

// =============================================================================
// Types
// =============================================================================

export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: AuthError | Error | null;
  message?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  metadata?: {
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    accountType?: string;
    phoneNumber?: string;
    businessName?: string;
  };
}

export interface SignInData {
  email: string;
  password: string;
}

// =============================================================================
// Auth Functions
// =============================================================================

/**
 * Sign up a new user with email and password
 * 
 * @param data - Sign up data including email, password, and optional metadata
 * @returns AuthResult with success status and user/session data
 */
export async function signUp(data: SignUpData): Promise<AuthResult> {
  try {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: data.metadata ? {
          first_name: data.metadata.firstName,
          last_name: data.metadata.lastName,
          preferred_name: data.metadata.preferredName,
          account_type: data.metadata.accountType,
          phone_number: data.metadata.phoneNumber,
          business_name: data.metadata.businessName,
        } : undefined,
      },
    });

    if (error) {
      return {
        success: false,
        error,
        message: getAuthErrorMessage(error),
      };
    }

    // Check if email confirmation is required
    if (authData.user && !authData.session) {
      return {
        success: true,
        user: authData.user,
        session: null,
        message: "Please check your email to confirm your account.",
      };
    }

    return {
      success: true,
      user: authData.user,
      session: authData.session,
      message: "Account created successfully!",
    };
  } catch (err) {
    return {
      success: false,
      error: err as Error,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Sign in an existing user with email and password
 * 
 * @param data - Sign in data with email and password
 * @returns AuthResult with success status and session data
 */
export async function signIn(data: SignInData): Promise<AuthResult> {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });

    if (error) {
      return {
        success: false,
        error,
        message: getAuthErrorMessage(error),
      };
    }

    return {
      success: true,
      user: authData.user,
      session: authData.session,
      message: "Signed in successfully!",
    };
  } catch (err) {
    return {
      success: false,
      error: err as Error,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Sign out the current user
 * 
 * @returns AuthResult with success status
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error,
        message: getAuthErrorMessage(error),
      };
    }

    return {
      success: true,
      message: "Signed out successfully.",
    };
  } catch (err) {
    return {
      success: false,
      error: err as Error,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Send a password reset email
 * 
 * @param email - Email address to send reset link to
 * @returns AuthResult with success status
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      return {
        success: false,
        error,
        message: getAuthErrorMessage(error),
      };
    }

    return {
      success: true,
      message: "Check your email for a password reset link.",
    };
  } catch (err) {
    return {
      success: false,
      error: err as Error,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Update user password (after clicking reset link)
 * 
 * @param newPassword - New password to set
 * @returns AuthResult with success status
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error,
        message: getAuthErrorMessage(error),
      };
    }

    return {
      success: true,
      user: data.user,
      message: "Password updated successfully!",
    };
  } catch (err) {
    return {
      success: false,
      error: err as Error,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get current session
 * 
 * @returns Current session or null
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * Get current user
 * 
 * @returns Current user or null
 */
export async function getUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Convert Supabase auth errors to user-friendly messages
 */
function getAuthErrorMessage(error: AuthError): string {
  const errorMessages: Record<string, string> = {
    "Invalid login credentials": "Invalid email or password. Please try again.",
    "Email not confirmed": "Please confirm your email address before signing in.",
    "User already registered": "An account with this email already exists. Please sign in.",
    "Password should be at least 6 characters": "Password must be at least 8 characters long.",
    "Unable to validate email address: invalid format": "Please enter a valid email address.",
    "Email rate limit exceeded": "Too many attempts. Please try again later.",
    "Invalid Refresh Token: Refresh Token Not Found": "Your session has expired. Please sign in again.",
    "New password should be different from the old password": "Please choose a different password.",
  };

  // Check for known error messages
  for (const [key, message] of Object.entries(errorMessages)) {
    if (error.message.includes(key)) {
      return message;
    }
  }

  // Return the original error message if no match found
  return error.message || "An error occurred. Please try again.";
}

// =============================================================================
// Auth State Listener
// =============================================================================

/**
 * Subscribe to auth state changes
 * 
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      // Only synchronous state updates in callback to prevent deadlocks
      callback(event, session);
    }
  );

  return () => subscription.unsubscribe();
}
