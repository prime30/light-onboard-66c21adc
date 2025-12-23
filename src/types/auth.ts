/**
 * Authentication and Registration Types
 *
 * This file contains all type definitions for the auth/registration flow.
 * Centralized here to ensure consistency across components.
 */

/** Authentication mode - either signing up or signing in */
export type AuthMode = "signup" | "signin";

/** Registration flow steps */
export type Step =
  | "onboarding"
  | "reviews"
  | "account-type"
  | "contact-basics"
  | "license"
  | "business-operation"
  | "business-location"
  | "school-info"
  | "wholesale-terms"
  | "tax-exemption"
  | "contact-info"
  | "summary"
  | "success";

/** Account type options */
export type AccountType = "professional" | "salon" | "student" | null;

/** Business operation type for professionals */
export type BusinessOperationType = "commission" | "independent" | null;

/** Transition direction for animations */
export type TransitionDirection = "forward" | "backward";

/** Mode transition direction for signup/signin switch */
export type ModeTransitionDirection = "left" | "right";

/**
 * UI state for the registration flow
 * Controls animations, modals, and visual feedback
 */
export interface RegistrationUIState {
  currentStep: Step;
  currentSlide: number;
  transitionDirection: TransitionDirection;
  modeTransitionDirection: ModeTransitionDirection;
  isTransitioning: boolean;
  nextStep: Step | null;
  displayTotalSteps: number;
  completedSteps: Set<number>;

  // Highlight states
  highlightFields: string[];
  highlightWholesaleTerms: boolean;
  highlightWholesaleFade: boolean;

  // Modal states
  modalDragOffset: number;
  isClosing: boolean;
  isBouncingBack: boolean;
  showAccountTypeConfirm: boolean;
  pendingAccountType: AccountType;
  showForgotPassword: boolean;
  submitTooltipOpen: boolean;

  // Loading states
  isSubmitting: boolean;
  isSendingReset: boolean;
  isSavingProgress: boolean;
  saveProgressText: "saving" | "saved";

  // Validation
  showValidationErrors: boolean;

  // Footer animation
  footerTransitionsEnabled: boolean;
  footerEnterReady: boolean;

  // Scroll tracking
  hasScrolled: boolean;
  shimmerKey: number;
}

/**
 * Sign-in form data
 */
export interface SignInFormData {
  email: string;
  password: string;
}

/**
 * Preserved signup state for mode switching
 */
export interface PreservedSignupState {
  step: Step;
  formData: RegistrationFormData;
  completedSteps: Set<number>;
}

/**
 * Preserved signin state for mode switching
 */
export interface PreservedSigninState {
  email: string;
  password: string;
}

/**
 * Step configuration for navigation and validation
 */
export interface StepConfig {
  id: Step;
  label: string;
  stepNumber: number;
  requiredFor: AccountType[];
  validate?: (data: RegistrationFormData) => boolean;
}

/**
 * Step validation result
 */
export interface StepValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: Record<string, string>;
}

/**
 * Testimonial data structure
 */
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}

/**
 * Slide data for onboarding carousel
 */
export interface OnboardingSlide {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
}

/**
 * Stat data for hero section
 */
export interface HeroStat {
  value: number;
  suffix: string;
  label: string;
}

/**
 * Feature box data
 */
export interface FeatureData {
  icon: React.ElementType;
  label: string;
  desc: string;
}
