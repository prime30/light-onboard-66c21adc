/**
 * useFormPersistence Hook
 * 
 * Handles saving and restoring form progress to/from sessionStorage.
 * Form data persists within a browser tab session but is cleared when the tab closes.
 */

import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { Step, AccountType, BusinessOperationType } from "@/types/auth";
import { isValidEmail, formatPhoneNumber } from "@/lib/validations/form-utils";

// Storage key for sessionStorage
const STORAGE_KEY = "auth_form_progress";

// Helper to check valid phone number
const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

/**
 * Form data structure for persistence
 * Note: File objects cannot be serialized, so file uploads are not persisted
 */
export interface PersistedFormData {
  mode: "signup" | "signin";
  currentStep: Step;
  accountType: AccountType;
  licenseNumber: string;
  state: string;
  firstName: string;
  lastName: string;
  email: string;
  // password intentionally not persisted for security
  businessName: string;
  businessAddress: string;
  suiteNumber: string;
  country: string;
  city: string;
  zipCode: string;
  wholesaleAgreed: boolean;
  hasTaxExemption: boolean | null;
  preferredName: string;
  phoneNumber: string;
  phoneCountryCode: string;
  salonSize: string;
  salonStructure: string;
  schoolName: string;
  schoolState: string;
  businessOperationType: BusinessOperationType;
  birthdayMonth: string;
  birthdayDay: string;
  socialMediaHandle: string;
  referralSource: string;
  completedSteps: number[];
}

/**
 * Calculate which steps are completed based on form data
 */
export function calculateCompletedSteps(data: {
  accountType: AccountType;
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
  enrollmentProofFilesCount: number;
  businessOperationType: BusinessOperationType;
  hasTaxExemption: boolean | null;
  hasTaxExemptFile: boolean;
  wholesaleAgreed: boolean;
}): Set<number> {
  const completed = new Set<number>();
  
  // Step 1 is always complete if we have an account type
  if (!data.accountType) return completed;
  completed.add(1);
  
  // Contact basics validation (shared across all flows)
  const contactBasicsValid = 
    data.firstName.trim() !== "" && 
    data.lastName.trim() !== "" && 
    isValidEmail(data.email) && 
    isValidPhoneNumber(data.phoneNumber);
  
  // Tax exemption validation (shared across all flows)
  const taxExemptionValid = 
    data.hasTaxExemption === false || 
    (data.hasTaxExemption === true && data.hasTaxExemptFile);
  
  if (data.accountType === "student") {
    // Student flow: 1-account-type, 2-school-info, 3-contact-basics, 4-tax-exemption, 5-wholesale-terms, 6-contact-info
    const schoolInfoValid = 
      data.schoolName.trim() !== "" && 
      data.schoolState !== "" && 
      data.enrollmentProofFilesCount > 0;
    
    if (schoolInfoValid) completed.add(2);
    if (contactBasicsValid) completed.add(3);
    if (taxExemptionValid) completed.add(4);
    if (data.wholesaleAgreed) completed.add(5);
    completed.add(6); // Step 6 (contact-info) is optional, always complete
  } else if (data.accountType === "salon") {
    // Salon flow: 1-account-type, 2-business-location, 3-contact-basics, 4-license, 5-tax-exemption, 6-wholesale-terms, 7-contact-info
    const businessLocationValid = 
      data.businessName.trim() !== "" && 
      data.businessAddress.trim() !== "" && 
      data.country !== "" && 
      data.city.trim() !== "" && 
      data.state !== "" && 
      data.zipCode.trim() !== "";
    
    const licenseValid = 
      data.licenseNumber.trim() !== "" && 
      data.salonSize !== "" && 
      data.salonStructure !== "";
    
    if (businessLocationValid) completed.add(2);
    if (contactBasicsValid) completed.add(3);
    if (licenseValid) completed.add(4);
    if (taxExemptionValid) completed.add(5);
    if (data.wholesaleAgreed) completed.add(6);
    completed.add(7); // Step 7 (contact-info) is optional, always complete
  } else {
    // Professional flow: 1-account-type, 2-business-operation, 3-contact-basics, 4-business-location, 5-license, 6-tax-exemption, 7-wholesale-terms, 8-contact-info
    const businessOperationValid = data.businessOperationType !== null;
    
    const businessLocationValid = 
      data.businessName.trim() !== "" && 
      data.businessAddress.trim() !== "" && 
      data.country !== "" && 
      data.city.trim() !== "" && 
      data.state !== "" && 
      data.zipCode.trim() !== "";
    
    const licenseValid = data.licenseNumber.trim() !== "";
    
    if (businessOperationValid) completed.add(2);
    if (contactBasicsValid) completed.add(3);
    if (businessLocationValid) completed.add(4);
    if (licenseValid) completed.add(5);
    if (taxExemptionValid) completed.add(6);
    if (data.wholesaleAgreed) completed.add(7);
    completed.add(8); // Step 8 (contact-info) is optional, always complete
  }
  
  return completed;
}

interface UseFormPersistenceOptions {
  /** Whether to show a toast when progress is restored */
  showRestoreToast?: boolean;
  /** Callback when form data is restored */
  onRestore?: (data: Partial<PersistedFormData>) => void;
}

interface FormDataToSave {
  mode: "signup" | "signin";
  currentStep: Step;
  accountType: AccountType;
  licenseNumber: string;
  state: string;
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  businessAddress: string;
  suiteNumber: string;
  country: string;
  city: string;
  zipCode: string;
  wholesaleAgreed: boolean;
  hasTaxExemption: boolean | null;
  preferredName: string;
  phoneNumber: string;
  phoneCountryCode: string;
  salonSize: string;
  salonStructure: string;
  schoolName: string;
  schoolState: string;
  businessOperationType: BusinessOperationType;
  birthdayMonth: string;
  birthdayDay: string;
  socialMediaHandle: string;
  referralSource: string;
  completedSteps: Set<number>;
}

/**
 * Hook for persisting form data to sessionStorage
 */
export function useFormPersistence(options: UseFormPersistenceOptions = {}) {
  const { showRestoreToast = true, onRestore } = options;
  const hasRestoredRef = useRef(false);

  /**
   * Load saved form data from sessionStorage
   */
  const loadSavedData = useCallback((): Partial<PersistedFormData> | null => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load form progress from sessionStorage:", e);
    }
    return null;
  }, []);

  /**
   * Save form data to sessionStorage
   */
  const saveFormData = useCallback((data: FormDataToSave) => {
    // Don't save if on success step
    if (data.currentStep === "success") {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    
    try {
      const toSave = {
        ...data,
        // Convert Set to array for JSON serialization
        completedSteps: Array.from(data.completedSteps),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn("Failed to save form progress to sessionStorage:", e);
    }
  }, []);

  /**
   * Clear saved form data
   */
  const clearSavedData = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear form progress from sessionStorage:", e);
    }
  }, []);

  /**
   * Restore form data on mount (should be called once)
   */
  const restoreOnMount = useCallback(() => {
    if (hasRestoredRef.current) return null;
    hasRestoredRef.current = true;

    const savedData = loadSavedData();
    if (!savedData) return null;

    // Calculate completed steps from restored data
    const recalculatedSteps = calculateCompletedSteps({
      accountType: savedData.accountType || null,
      firstName: savedData.firstName || "",
      lastName: savedData.lastName || "",
      email: savedData.email || "",
      phoneNumber: savedData.phoneNumber || "",
      businessName: savedData.businessName || "",
      businessAddress: savedData.businessAddress || "",
      country: savedData.country || "",
      city: savedData.city || "",
      state: savedData.state || "",
      zipCode: savedData.zipCode || "",
      licenseNumber: savedData.licenseNumber || "",
      salonSize: savedData.salonSize || "",
      salonStructure: savedData.salonStructure || "",
      schoolName: savedData.schoolName || "",
      schoolState: savedData.schoolState || "",
      enrollmentProofFilesCount: 0, // Files can't be restored
      businessOperationType: savedData.businessOperationType || null,
      hasTaxExemption: savedData.hasTaxExemption ?? null,
      hasTaxExemptFile: false, // Files can't be restored
      wholesaleAgreed: savedData.wholesaleAgreed || false,
    });

    // Show toast if meaningful progress was restored
    if (
      showRestoreToast &&
      savedData.currentStep &&
      savedData.currentStep !== "onboarding" &&
      savedData.currentStep !== "reviews"
    ) {
      setTimeout(() => {
        toast("Welcome back!", {
          description: "Your previous progress has been restored.",
          duration: 4000,
        });
      }, 500);
    }

    const restoredData = {
      ...savedData,
      completedSteps: Array.from(recalculatedSteps),
    };

    onRestore?.(restoredData);

    return restoredData;
  }, [loadSavedData, showRestoreToast, onRestore]);

  return {
    loadSavedData,
    saveFormData,
    clearSavedData,
    restoreOnMount,
    calculateCompletedSteps,
  };
}

export { STORAGE_KEY };
