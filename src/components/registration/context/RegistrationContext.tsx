/**
 * Registration Context
 *
 * Centralized state management for the multi-step registration flow.
 * Uses useReducer for predictable state updates and easier debugging.
 */

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type {
  Step,
  AccountType,
  TransitionDirection,
  ModeTransitionDirection,
  RegistrationUIState,
} from "@/types/auth";
import { RegistrationFormData } from "@/lib/validations/auth-schemas";

// ============================================================================
// Initial State
// ============================================================================

const initialFormData: RegistrationFormData = {
  accountType: null,
  businessOperationType: null,
  firstName: "",
  lastName: "",
  preferredName: "",
  email: "",
  phoneNumber: "",
  phoneCountryCode: "+1",
  businessName: "",
  businessAddress: "",
  suiteNumber: "",
  country: "United States",
  city: "",
  state: "",
  zipCode: "",
  schoolName: "",
  schoolState: "",
  enrollmentProofFiles: [],
  licenseNumber: "",
  salonSize: "",
  salonStructure: "",
  licenseFile: null,
  licenseProofFiles: [],
  hasTaxExemption: null,
  taxExemptFile: null,
  wholesaleAgreed: false,
  birthdayMonth: "",
  birthdayDay: "",
  socialMediaHandle: "",
  referralSource: "",
  subscribeOrderUpdates: true,
  acceptsMarketing: true,
};

const initialUIState: RegistrationUIState = {
  currentStep: "onboarding",
  currentSlide: 0,
  transitionDirection: "forward",
  modeTransitionDirection: "right",
  isTransitioning: false,
  nextStep: null,
  displayTotalSteps: 7,
  completedSteps: new Set(),
  highlightFields: [],
  highlightWholesaleTerms: false,
  highlightWholesaleFade: false,
  modalDragOffset: 0,
  isClosing: false,
  isBouncingBack: false,
  showAccountTypeConfirm: false,
  pendingAccountType: null,
  showForgotPassword: false,
  submitTooltipOpen: false,
  isSubmitting: false,
  isSendingReset: false,
  isSavingProgress: false,
  saveProgressText: "saving",
  showValidationErrors: false,
  footerTransitionsEnabled: false,
  footerEnterReady: false,
  hasScrolled: false,
  shimmerKey: 0,
};

interface RegistrationState {
  formData: RegistrationFormData;
  ui: RegistrationUIState;
}

const initialState: RegistrationState = {
  formData: initialFormData,
  ui: initialUIState,
};

// ============================================================================
// Action Types
// ============================================================================

type RegistrationAction =
  // Form data actions
  | {
      type: "SET_FORM_FIELD";
      field: keyof RegistrationFormData;
      value: RegistrationFormData[keyof RegistrationFormData];
    }
  | { type: "SET_FORM_DATA"; data: Partial<RegistrationFormData> }
  | { type: "RESET_FORM" }

  // Navigation actions
  | { type: "SET_STEP"; step: Step }
  | { type: "GO_TO_NEXT_STEP" }
  | { type: "GO_TO_PREVIOUS_STEP" }
  | { type: "SET_CURRENT_SLIDE"; slide: number }

  // Transition actions
  | { type: "START_TRANSITION"; nextStep: Step; direction: TransitionDirection }
  | { type: "END_TRANSITION" }
  | { type: "SET_MODE_TRANSITION_DIRECTION"; direction: ModeTransitionDirection }

  // UI state actions
  | { type: "SET_DISPLAY_TOTAL_STEPS"; total: number }
  | { type: "ADD_COMPLETED_STEP"; stepNumber: number }
  | { type: "SET_COMPLETED_STEPS"; steps: Set<number> }
  | { type: "SET_HIGHLIGHT_FIELDS"; fields: string[] }
  | { type: "SET_HIGHLIGHT_WHOLESALE_TERMS"; value: boolean }
  | { type: "SET_HIGHLIGHT_WHOLESALE_FADE"; value: boolean }

  // Modal actions
  | { type: "SET_MODAL_DRAG_OFFSET"; offset: number }
  | { type: "SET_IS_CLOSING"; value: boolean }
  | { type: "SET_IS_BOUNCING_BACK"; value: boolean }
  | { type: "SET_SHOW_ACCOUNT_TYPE_CONFIRM"; value: boolean }
  | { type: "SET_PENDING_ACCOUNT_TYPE"; value: AccountType }
  | { type: "SET_SHOW_FORGOT_PASSWORD"; value: boolean }
  | { type: "SET_SUBMIT_TOOLTIP_OPEN"; value: boolean }

  // Loading actions
  | { type: "SET_IS_SUBMITTING"; value: boolean }
  | { type: "SET_IS_SENDING_RESET"; value: boolean }
  | { type: "SET_IS_SAVING_PROGRESS"; value: boolean }
  | { type: "SET_SAVE_PROGRESS_TEXT"; value: "saving" | "saved" }

  // Validation actions
  | { type: "SET_SHOW_VALIDATION_ERRORS"; value: boolean }

  // Footer actions
  | { type: "SET_FOOTER_TRANSITIONS_ENABLED"; value: boolean }
  | { type: "SET_FOOTER_ENTER_READY"; value: boolean }

  // Misc actions
  | { type: "SET_HAS_SCROLLED"; value: boolean }
  | { type: "INCREMENT_SHIMMER_KEY" }

  // Bulk state restoration
  | { type: "RESTORE_STATE"; state: Partial<RegistrationState> };

// ============================================================================
// Reducer
// ============================================================================

function registrationReducer(
  state: RegistrationState,
  action: RegistrationAction
): RegistrationState {
  switch (action.type) {
    // Form data actions
    case "SET_FORM_FIELD":
      return {
        ...state,
        formData: { ...state.formData, [action.field]: action.value },
      };
    case "SET_FORM_DATA":
      return {
        ...state,
        formData: { ...state.formData, ...action.data },
      };
    case "RESET_FORM":
      return {
        ...state,
        formData: initialFormData,
      };

    // Navigation actions
    case "SET_STEP":
      return {
        ...state,
        ui: { ...state.ui, currentStep: action.step },
      };
    case "SET_CURRENT_SLIDE":
      return {
        ...state,
        ui: { ...state.ui, currentSlide: action.slide },
      };

    // Transition actions
    case "START_TRANSITION":
      return {
        ...state,
        ui: {
          ...state.ui,
          isTransitioning: true,
          nextStep: action.nextStep,
          transitionDirection: action.direction,
        },
      };
    case "END_TRANSITION":
      return {
        ...state,
        ui: {
          ...state.ui,
          isTransitioning: false,
          currentStep: state.ui.nextStep || state.ui.currentStep,
          nextStep: null,
        },
      };
    case "SET_MODE_TRANSITION_DIRECTION":
      return {
        ...state,
        ui: { ...state.ui, modeTransitionDirection: action.direction },
      };

    // UI state actions
    case "SET_DISPLAY_TOTAL_STEPS":
      return {
        ...state,
        ui: { ...state.ui, displayTotalSteps: action.total },
      };
    case "ADD_COMPLETED_STEP":
      return {
        ...state,
        ui: {
          ...state.ui,
          completedSteps: new Set([...state.ui.completedSteps, action.stepNumber]),
        },
      };
    case "SET_COMPLETED_STEPS":
      return {
        ...state,
        ui: { ...state.ui, completedSteps: action.steps },
      };
    case "SET_HIGHLIGHT_FIELDS":
      return {
        ...state,
        ui: { ...state.ui, highlightFields: action.fields },
      };
    case "SET_HIGHLIGHT_WHOLESALE_TERMS":
      return {
        ...state,
        ui: { ...state.ui, highlightWholesaleTerms: action.value },
      };
    case "SET_HIGHLIGHT_WHOLESALE_FADE":
      return {
        ...state,
        ui: { ...state.ui, highlightWholesaleFade: action.value },
      };

    // Modal actions
    case "SET_MODAL_DRAG_OFFSET":
      return {
        ...state,
        ui: { ...state.ui, modalDragOffset: action.offset },
      };
    case "SET_IS_CLOSING":
      return {
        ...state,
        ui: { ...state.ui, isClosing: action.value },
      };
    case "SET_IS_BOUNCING_BACK":
      return {
        ...state,
        ui: { ...state.ui, isBouncingBack: action.value },
      };
    case "SET_SHOW_ACCOUNT_TYPE_CONFIRM":
      return {
        ...state,
        ui: { ...state.ui, showAccountTypeConfirm: action.value },
      };
    case "SET_PENDING_ACCOUNT_TYPE":
      return {
        ...state,
        ui: { ...state.ui, pendingAccountType: action.value },
      };
    case "SET_SHOW_FORGOT_PASSWORD":
      return {
        ...state,
        ui: { ...state.ui, showForgotPassword: action.value },
      };
    case "SET_SUBMIT_TOOLTIP_OPEN":
      return {
        ...state,
        ui: { ...state.ui, submitTooltipOpen: action.value },
      };

    // Loading actions
    case "SET_IS_SUBMITTING":
      return {
        ...state,
        ui: { ...state.ui, isSubmitting: action.value },
      };
    case "SET_IS_SENDING_RESET":
      return {
        ...state,
        ui: { ...state.ui, isSendingReset: action.value },
      };
    case "SET_IS_SAVING_PROGRESS":
      return {
        ...state,
        ui: { ...state.ui, isSavingProgress: action.value },
      };
    case "SET_SAVE_PROGRESS_TEXT":
      return {
        ...state,
        ui: { ...state.ui, saveProgressText: action.value },
      };

    // Validation actions
    case "SET_SHOW_VALIDATION_ERRORS":
      return {
        ...state,
        ui: { ...state.ui, showValidationErrors: action.value },
      };

    // Footer actions
    case "SET_FOOTER_TRANSITIONS_ENABLED":
      return {
        ...state,
        ui: { ...state.ui, footerTransitionsEnabled: action.value },
      };
    case "SET_FOOTER_ENTER_READY":
      return {
        ...state,
        ui: { ...state.ui, footerEnterReady: action.value },
      };

    // Misc actions
    case "SET_HAS_SCROLLED":
      return {
        ...state,
        ui: { ...state.ui, hasScrolled: action.value },
      };
    case "INCREMENT_SHIMMER_KEY":
      return {
        ...state,
        ui: { ...state.ui, shimmerKey: state.ui.shimmerKey + 1 },
      };

    // Bulk state restoration
    case "RESTORE_STATE":
      return {
        formData: action.state.formData
          ? { ...state.formData, ...action.state.formData }
          : state.formData,
        ui: action.state.ui ? { ...state.ui, ...action.state.ui } : state.ui,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface RegistrationContextValue {
  state: RegistrationState;
  dispatch: React.Dispatch<RegistrationAction>;

  // Convenience accessors
  formData: RegistrationFormData;
  ui: RegistrationUIState;

  // Form field helpers
  setFormField: <K extends keyof RegistrationFormData>(
    field: K,
    value: RegistrationFormData[K]
  ) => void;
  setFormData: (data: Partial<RegistrationFormData>) => void;
  resetForm: () => void;

  // Navigation helpers
  goToStep: (step: Step) => void;
  startTransition: (nextStep: Step, direction: TransitionDirection) => void;
  endTransition: () => void;

  // UI helpers
  setIsSubmitting: (value: boolean) => void;
  setShowValidationErrors: (value: boolean) => void;
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export function RegistrationProvider({ children }: RegistrationProviderProps) {
  const [state, dispatch] = useReducer(registrationReducer, initialState);

  // Convenience accessors
  const formData = state.formData;
  const ui = state.ui;

  // Form field helpers
  const setFormField = useCallback(
    <K extends keyof RegistrationFormData>(field: K, value: RegistrationFormData[K]) => {
      dispatch({
        type: "SET_FORM_FIELD",
        field,
        value: value as RegistrationFormData[keyof RegistrationFormData],
      });
    },
    []
  );

  const setFormData = useCallback((data: Partial<RegistrationFormData>) => {
    dispatch({ type: "SET_FORM_DATA", data });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: "RESET_FORM" });
  }, []);

  // Navigation helpers
  const goToStep = useCallback((step: Step) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  const startTransition = useCallback((nextStep: Step, direction: TransitionDirection) => {
    dispatch({ type: "START_TRANSITION", nextStep, direction });
  }, []);

  const endTransition = useCallback(() => {
    dispatch({ type: "END_TRANSITION" });
  }, []);

  // UI helpers
  const setIsSubmitting = useCallback((value: boolean) => {
    dispatch({ type: "SET_IS_SUBMITTING", value });
  }, []);

  const setShowValidationErrors = useCallback((value: boolean) => {
    dispatch({ type: "SET_SHOW_VALIDATION_ERRORS", value });
  }, []);

  const value: RegistrationContextValue = {
    state,
    dispatch,
    formData,
    ui,
    setFormField,
    setFormData,
    resetForm,
    goToStep,
    startTransition,
    endTransition,
    setIsSubmitting,
    setShowValidationErrors,
  };

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useRegistration() {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used within a RegistrationProvider");
  }
  return context;
}

// Export types for external use
export type { RegistrationState, RegistrationAction };
export { initialFormData, initialUIState };
