/**
 * useRegistrationSync Hook
 *
 * This hook bridges the existing Auth.tsx state management with the new
 * RegistrationContext. It provides a way to gradually migrate from
 * scattered useState calls to centralized context state.
 *
 * Usage:
 * 1. Import this hook in Auth.tsx
 * 2. Pass current state values to syncToContext
 * 3. Step components can then read from useRegistration() context
 */

import { useEffect, useRef } from "react";
import { useRegistration } from "@/components/registration/context/RegistrationContext";
import type { Step, AccountType, BusinessOperationType } from "@/types/auth";

interface FormStateToSync {
  accountType: AccountType;
  businessOperationType: BusinessOperationType;
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phoneNumber: string;
  phoneCountryCode: string;
  businessName: string;
  businessAddress: string;
  suiteNumber: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
  schoolName: string;
  schoolState: string;
  enrollmentProofFiles: File[];
  licenseNumber: string;
  salonSize: string;
  salonStructure: string;
  licenseFile: File | null;
  licenseProofFiles: File[];
  hasTaxExemption: boolean | null;
  taxExemptFile: File | null;
  wholesaleAgreed: boolean;
  birthdayMonth: string;
  birthdayDay: string;
  socialMediaHandle: string;
  referralSource: string;
  subscribeOrderUpdates: boolean;
  acceptsMarketing: boolean;
  password: string;
}

interface UIStateToSync {
  currentStep: Step;
  currentSlide: number;
  displayTotalSteps: number;
  completedSteps: Set<number>;
  showValidationErrors: boolean;
  isSubmitting: boolean;
  isTransitioning: boolean;
}

/**
 * Syncs local Auth.tsx state to the RegistrationContext
 * This enables step components to consume from context without
 * requiring a full refactor of Auth.tsx
 */
export function useRegistrationSync(
  formState: Partial<FormStateToSync>,
  uiState: Partial<UIStateToSync>
) {
  const { dispatch, setFormData } = useRegistration();
  const lastFormState = useRef<string>("");
  const lastUIState = useRef<string>("");

  // Sync form data to context
  useEffect(() => {
    const formStateString = JSON.stringify({
      accountType: formState.accountType,
      businessOperationType: formState.businessOperationType,
      firstName: formState.firstName,
      lastName: formState.lastName,
      preferredName: formState.preferredName,
      email: formState.email,
      phoneNumber: formState.phoneNumber,
      phoneCountryCode: formState.phoneCountryCode,
      businessName: formState.businessName,
      businessAddress: formState.businessAddress,
      suiteNumber: formState.suiteNumber,
      country: formState.country,
      city: formState.city,
      state: formState.state,
      zipCode: formState.zipCode,
      schoolName: formState.schoolName,
      schoolState: formState.schoolState,
      licenseNumber: formState.licenseNumber,
      salonSize: formState.salonSize,
      salonStructure: formState.salonStructure,
      hasTaxExemption: formState.hasTaxExemption,
      wholesaleAgreed: formState.wholesaleAgreed,
      birthdayMonth: formState.birthdayMonth,
      birthdayDay: formState.birthdayDay,
      socialMediaHandle: formState.socialMediaHandle,
      referralSource: formState.referralSource,
      subscribeOrderUpdates: formState.subscribeOrderUpdates,
      acceptsMarketing: formState.acceptsMarketing,
      password: formState.password,
    });

    // Only update if state has actually changed
    if (formStateString !== lastFormState.current) {
      lastFormState.current = formStateString;

      // Sync to context (excluding File objects which can't be serialized)
      setFormData({
        accountType: formState.accountType,
        businessOperationType: formState.businessOperationType,
        firstName: formState.firstName ?? "",
        lastName: formState.lastName ?? "",
        preferredName: formState.preferredName ?? "",
        email: formState.email ?? "",
        phoneNumber: formState.phoneNumber ?? "",
        phoneCountryCode: formState.phoneCountryCode ?? "+1",
        businessName: formState.businessName ?? "",
        businessAddress: formState.businessAddress ?? "",
        suiteNumber: formState.suiteNumber ?? "",
        country: formState.country ?? "United States",
        city: formState.city ?? "",
        state: formState.state ?? "",
        zipCode: formState.zipCode ?? "",
        schoolName: formState.schoolName ?? "",
        schoolState: formState.schoolState ?? "",
        enrollmentProofFiles: formState.enrollmentProofFiles ?? [],
        licenseNumber: formState.licenseNumber ?? "",
        salonSize: formState.salonSize ?? "",
        salonStructure: formState.salonStructure ?? "",
        licenseFile: formState.licenseFile ?? null,
        licenseProofFiles: formState.licenseProofFiles ?? [],
        hasTaxExemption: formState.hasTaxExemption ?? null,
        taxExemptFile: formState.taxExemptFile ?? null,
        wholesaleAgreed: formState.wholesaleAgreed ?? false,
        birthdayMonth: formState.birthdayMonth ?? "",
        birthdayDay: formState.birthdayDay ?? "",
        socialMediaHandle: formState.socialMediaHandle ?? "",
        referralSource: formState.referralSource ?? "",
        subscribeOrderUpdates: formState.subscribeOrderUpdates ?? true,
        acceptsMarketing: formState.acceptsMarketing ?? true,
        password: formState.password ?? "",
      });
    }
  }, [formState, setFormData]);

  // Sync UI state to context
  useEffect(() => {
    const uiStateString = JSON.stringify({
      currentStep: uiState.currentStep,
      currentSlide: uiState.currentSlide,
      displayTotalSteps: uiState.displayTotalSteps,
      showValidationErrors: uiState.showValidationErrors,
      isSubmitting: uiState.isSubmitting,
      isTransitioning: uiState.isTransitioning,
    });

    if (uiStateString !== lastUIState.current) {
      lastUIState.current = uiStateString;

      if (uiState.currentStep !== undefined) {
        dispatch({ type: "SET_STEP", step: uiState.currentStep });
      }
      if (uiState.currentSlide !== undefined) {
        dispatch({ type: "SET_CURRENT_SLIDE", slide: uiState.currentSlide });
      }
      if (uiState.displayTotalSteps !== undefined) {
        dispatch({ type: "SET_DISPLAY_TOTAL_STEPS", total: uiState.displayTotalSteps });
      }
      if (uiState.showValidationErrors !== undefined) {
        dispatch({ type: "SET_SHOW_VALIDATION_ERRORS", value: uiState.showValidationErrors });
      }
      if (uiState.isSubmitting !== undefined) {
        dispatch({ type: "SET_IS_SUBMITTING", value: uiState.isSubmitting });
      }
      if (uiState.completedSteps !== undefined) {
        dispatch({ type: "SET_COMPLETED_STEPS", steps: uiState.completedSteps });
      }
    }
  }, [uiState, dispatch]);
}

export type { FormStateToSync, UIStateToSync };
