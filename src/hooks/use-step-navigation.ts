/**
 * useStepNavigation Hook
 * 
 * Handles step navigation logic including:
 * - Step order based on account type
 * - Step validation
 * - Navigation between steps
 * - Progress calculation
 */

import { useCallback, useMemo } from "react";
import type { Step, AccountType, BusinessOperationType } from "@/types/auth";
import { isValidEmail } from "@/lib/validations/form-utils";

// Helper to check valid phone number
const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

/**
 * Step configuration by account type
 */
const STEP_ORDER: Record<string, Step[]> = {
  professional: [
    "account-type",
    "business-operation", 
    "contact-basics",
    "business-location",
    "license",
    "tax-exemption",
    "wholesale-terms",
    "contact-info",
    "summary",
  ],
  salon: [
    "account-type",
    "business-location",
    "contact-basics",
    "license",
    "tax-exemption",
    "wholesale-terms",
    "contact-info",
    "summary",
  ],
  student: [
    "account-type",
    "school-info",
    "contact-basics",
    "tax-exemption",
    "wholesale-terms",
    "contact-info",
    "summary",
  ],
};

/**
 * Get the step order for a given account type
 */
export function getStepOrder(accountType: AccountType): Step[] {
  if (!accountType) return ["account-type"];
  return STEP_ORDER[accountType] || STEP_ORDER.professional;
}

/**
 * Get total number of steps for account type (excluding success)
 */
export function getTotalStepsForAccountType(accountType: AccountType): number {
  if (!accountType) return 7; // Default before selection
  const steps = getStepOrder(accountType);
  return steps.length;
}

/**
 * Get step number for a given step (1-indexed)
 */
export function getStepNumber(step: Step, accountType: AccountType): number {
  if (step === "onboarding" || step === "reviews") return 0;
  if (step === "success") return getTotalStepsForAccountType(accountType) + 1;
  
  const steps = getStepOrder(accountType);
  const index = steps.indexOf(step);
  return index >= 0 ? index + 1 : 0;
}

/**
 * Get step by number (1-indexed)
 */
export function getStepByNumber(stepNumber: number, accountType: AccountType): Step {
  if (stepNumber <= 0) return "onboarding";
  
  const steps = getStepOrder(accountType);
  if (stepNumber > steps.length) return "success";
  
  return steps[stepNumber - 1];
}

interface FormData {
  accountType: AccountType;
  businessOperationType: BusinessOperationType;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  businessName: string;
  businessAddress: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
  licenseNumber: string;
  salonSize: string;
  salonStructure: string;
  schoolName: string;
  schoolState: string;
  enrollmentProofFiles: File[];
  hasTaxExemption: boolean | null;
  taxExemptFile: File | null;
  wholesaleAgreed: boolean;
  password: string;
}

interface UseStepNavigationOptions {
  formData: FormData;
  mode: "signup" | "signin";
}

/**
 * Hook for managing step navigation
 */
export function useStepNavigation({ formData, mode }: UseStepNavigationOptions) {
  const { accountType } = formData;

  /**
   * Get the step order for current account type
   */
  const stepOrder = useMemo(() => getStepOrder(accountType), [accountType]);

  /**
   * Get total number of steps
   */
  const totalSteps = useMemo(() => stepOrder.length, [stepOrder]);

  /**
   * Check if a specific step is valid
   */
  const isStepValid = useCallback((step: Step): boolean => {
    if (mode === "signin") {
      return isValidEmail(formData.email) && formData.password.length >= 8;
    }

    switch (step) {
      case "onboarding":
        return true;
      case "account-type":
        return formData.accountType !== null;
      case "contact-basics":
        return (
          formData.firstName.trim() !== "" &&
          formData.lastName.trim() !== "" &&
          isValidEmail(formData.email) &&
          isValidPhoneNumber(formData.phoneNumber)
        );
      case "license":
        if (formData.accountType === "salon") {
          return (
            formData.licenseNumber.trim() !== "" &&
            formData.salonSize !== "" &&
            formData.salonStructure !== ""
          );
        }
        return formData.licenseNumber.trim() !== "";
      case "business-operation":
        return formData.businessOperationType !== null;
      case "business-location":
        return (
          formData.businessName.trim() !== "" &&
          formData.businessAddress.trim() !== "" &&
          formData.country !== "" &&
          formData.city.trim() !== "" &&
          formData.state !== "" &&
          formData.zipCode.trim() !== ""
        );
      case "school-info":
        return (
          formData.schoolName.trim() !== "" &&
          formData.schoolState !== "" &&
          formData.enrollmentProofFiles.length > 0
        );
      case "wholesale-terms":
        return formData.wholesaleAgreed;
      case "tax-exemption":
        if (formData.hasTaxExemption === true) {
          return formData.taxExemptFile !== null;
        }
        return formData.hasTaxExemption !== null;
      case "contact-info":
        // Optional fields, always valid
        return true;
      case "summary":
        return isAllStepsValid();
      default:
        return true;
    }
  }, [formData, mode]);

  /**
   * Check if ALL steps are valid (for final submission)
   */
  const isAllStepsValid = useCallback((): boolean => {
    if (mode === "signin") {
      return isValidEmail(formData.email) && formData.password.length >= 8;
    }

    if (!formData.accountType) return false;

    const contactBasicsValid =
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      isValidEmail(formData.email) &&
      isValidPhoneNumber(formData.phoneNumber);

    const taxValid =
      formData.hasTaxExemption === false ||
      (formData.hasTaxExemption === true && formData.taxExemptFile !== null);

    if (formData.accountType === "student") {
      const schoolValid =
        formData.schoolName.trim() !== "" &&
        formData.schoolState !== "" &&
        formData.enrollmentProofFiles.length > 0;
      return schoolValid && contactBasicsValid && formData.wholesaleAgreed && taxValid;
    }

    if (formData.accountType === "salon") {
      const licenseValid =
        formData.licenseNumber.trim() !== "" &&
        formData.salonSize !== "" &&
        formData.salonStructure !== "";
      const businessValid =
        formData.businessName.trim() !== "" &&
        formData.businessAddress.trim() !== "" &&
        formData.country !== "" &&
        formData.city.trim() !== "" &&
        formData.state !== "" &&
        formData.zipCode.trim() !== "";
      return licenseValid && businessValid && contactBasicsValid && formData.wholesaleAgreed && taxValid;
    }

    // Professional
    const licenseValid = formData.licenseNumber.trim() !== "";
    const businessOperationValid = formData.businessOperationType !== null;
    const businessValid =
      formData.businessName.trim() !== "" &&
      formData.businessAddress.trim() !== "" &&
      formData.country !== "" &&
      formData.city.trim() !== "" &&
      formData.state !== "" &&
      formData.zipCode.trim() !== "";
    return (
      licenseValid &&
      businessOperationValid &&
      businessValid &&
      contactBasicsValid &&
      formData.wholesaleAgreed &&
      taxValid
    );
  }, [formData, mode]);

  /**
   * Get the next step from current step
   */
  const getNextStep = useCallback((currentStep: Step): Step | null => {
    if (currentStep === "onboarding") return "account-type";
    if (currentStep === "success") return null;

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < 0 || currentIndex >= stepOrder.length - 1) {
      return "success";
    }
    return stepOrder[currentIndex + 1];
  }, [stepOrder]);

  /**
   * Get the previous step from current step
   */
  const getPreviousStep = useCallback((currentStep: Step): Step | null => {
    if (currentStep === "onboarding") return null;
    if (currentStep === "account-type") return "onboarding";

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex <= 0) return "onboarding";
    return stepOrder[currentIndex - 1];
  }, [stepOrder]);

  /**
   * Get list of incomplete steps with their missing fields
   */
  const getIncompleteSteps = useCallback((): Array<{
    step: number;
    name: string;
    missingFields: string[];
  }> => {
    if (mode !== "signup") return [];

    const incomplete: Array<{
      step: number;
      name: string;
      missingFields: string[];
    }> = [];

    if (!formData.accountType) {
      incomplete.push({
        step: 1,
        name: "Account type",
        missingFields: ["Select account type"],
      });
      return incomplete;
    }

    // Check each step in order
    stepOrder.forEach((step, index) => {
      const stepNum = index + 1;
      const missing: string[] = [];

      switch (step) {
        case "contact-basics":
          if (!formData.firstName.trim()) missing.push("First name");
          if (!formData.lastName.trim()) missing.push("Last name");
          if (!isValidEmail(formData.email)) missing.push("Email");
          if (!isValidPhoneNumber(formData.phoneNumber)) missing.push("Phone number");
          break;
        case "business-location":
          if (!formData.businessName.trim()) missing.push("Business name");
          if (!formData.businessAddress.trim()) missing.push("Address");
          if (!formData.country) missing.push("Country");
          if (!formData.city.trim()) missing.push("City");
          if (!formData.state) missing.push("State/province");
          if (!formData.zipCode.trim()) missing.push("ZIP code");
          break;
        case "license":
          if (!formData.licenseNumber.trim()) missing.push("License number");
          if (formData.accountType === "salon") {
            if (!formData.salonSize) missing.push("Salon size");
            if (!formData.salonStructure) missing.push("Salon structure");
          }
          break;
        case "school-info":
          if (!formData.schoolName.trim()) missing.push("School name");
          if (!formData.schoolState) missing.push("State/province");
          if (formData.enrollmentProofFiles.length === 0) missing.push("Enrollment proof");
          break;
        case "business-operation":
          if (!formData.businessOperationType) missing.push("Business type");
          break;
        case "tax-exemption":
          if (formData.hasTaxExemption === null) missing.push("Exemption status");
          else if (formData.hasTaxExemption && !formData.taxExemptFile) missing.push("Tax document");
          break;
        case "wholesale-terms":
          if (!formData.wholesaleAgreed) missing.push("Terms agreement");
          break;
      }

      if (missing.length > 0) {
        const stepNames: Record<Step, string> = {
          "onboarding": "Onboarding",
          "reviews": "Reviews",
          "account-type": "Account type",
          "contact-basics": "Contact info",
          "license": "License",
          "business-operation": "Business type",
          "business-location": "Business location",
          "school-info": "School info",
          "wholesale-terms": "Wholesale terms",
          "tax-exemption": "Tax exemption",
          "contact-info": "Preferences",
          "summary": "Summary",
          "success": "Success",
        };

        incomplete.push({
          step: stepNum,
          name: stepNames[step],
          missingFields: missing,
        });
      }
    });

    return incomplete;
  }, [formData, mode, stepOrder]);

  /**
   * Calculate progress percentage
   */
  const calculateProgress = useCallback((currentStep: Step): number => {
    if (currentStep === "onboarding" || currentStep === "reviews") return 0;
    if (currentStep === "success") return 100;

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < 0) return 0;

    return Math.round(((currentIndex + 1) / stepOrder.length) * 100);
  }, [stepOrder]);

  return {
    stepOrder,
    totalSteps,
    isStepValid,
    isAllStepsValid,
    getNextStep,
    getPreviousStep,
    getIncompleteSteps,
    calculateProgress,
    getStepNumber: (step: Step) => getStepNumber(step, accountType),
    getStepByNumber: (num: number) => getStepByNumber(num, accountType),
  };
}


