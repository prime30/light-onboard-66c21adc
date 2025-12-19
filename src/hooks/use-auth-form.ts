import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCallback } from "react";
import { scrollToFirstError } from "@/lib/scroll-to-error";
import {
  accountTypeSchema,
  businessOperationSchema,
  schoolInfoSchema,
  contactBasicsSchema,
  businessLocationSchema,
  licenseSchema,
  salonLicenseSchema,
  taxExemptionSchema,
  wholesaleTermsSchema,
  preferencesSchema,
  signInSchema,
  forgotPasswordSchema,
} from "@/lib/validations/auth-schemas";

// Step validation schemas mapped by step name
const stepSchemas = {
  "account-type": accountTypeSchema,
  "business-operation": businessOperationSchema,
  "school-info": schoolInfoSchema,
  "contact-basics": contactBasicsSchema,
  "business-location": businessLocationSchema,
  "license": licenseSchema,
  "license-salon": salonLicenseSchema,
  "tax-exemption": taxExemptionSchema,
  "wholesale-terms": wholesaleTermsSchema,
  "preferences": preferencesSchema,
  "signin": signInSchema,
  "forgot-password": forgotPasswordSchema,
} as const;

export type StepName = keyof typeof stepSchemas;

// Default form values
export const defaultFormValues = {
  // Account type
  accountType: null as "professional" | "salon" | "student" | null,
  
  // Business operation (professional only)
  businessOperationType: null as "commission" | "independent" | null,
  
  // Contact basics
  firstName: "",
  lastName: "",
  preferredName: "",
  email: "",
  phoneNumber: "",
  phoneCountryCode: "+1",
  
  // Business location (professional and salon)
  businessName: "",
  businessAddress: "",
  suiteNumber: "",
  country: "",
  city: "",
  state: "",
  zipCode: "",
  
  // School info (student only)
  schoolName: "",
  schoolState: "",
  enrollmentProofFiles: [] as File[],
  
  // License (professional and salon)
  licenseNumber: "",
  salonSize: "",
  salonStructure: "",
  licenseFile: null as File | null,
  licenseProofFiles: [] as File[],
  
  // Tax exemption
  hasTaxExemption: null as boolean | null,
  taxExemptFile: null as File | null,
  
  // Wholesale terms
  agreedToWholesaleTerms: false,
  
  // Preferences
  birthdayMonth: "",
  birthdayDay: "",
  socialMediaHandle: "",
  subscribeOrderUpdates: true,
  subscribeMarketing: false,
  subscribePromotions: true,
  
  // Password
  password: "",
  
  // Referral source (post-signup)
  referralSource: "",
};

export type AuthFormValues = typeof defaultFormValues;

interface UseAuthFormOptions {
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

/**
 * Custom hook for managing the auth form with react-hook-form
 * Supports step-by-step validation and scroll-to-error
 */
export function useAuthForm(options: UseAuthFormOptions = {}) {
  const { scrollContainerRef } = options;
  
  const form = useForm<AuthFormValues>({
    defaultValues: defaultFormValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const { trigger, formState: { errors } } = form;

  /**
   * Validate a specific step and scroll to first error if validation fails
   */
  const validateStep = useCallback(async (
    stepName: StepName,
    accountType?: "professional" | "salon" | "student" | null
  ): Promise<boolean> => {
    // Get the schema for this step
    let schema = stepSchemas[stepName];
    
    // Special handling for license step based on account type
    if (stepName === "license" && accountType === "salon") {
      schema = stepSchemas["license-salon"];
    }

    // Get the field names from the schema
    const fieldNames = Object.keys(schema.shape || {}) as (keyof AuthFormValues)[];
    
    // Trigger validation for these fields
    const isValid = await trigger(fieldNames);
    
    if (!isValid) {
      // Scroll to first error using form errors
      scrollToFirstError(errors as FieldErrors, scrollContainerRef);
    }
    
    return isValid;
  }, [trigger, errors, scrollContainerRef]);

  /**
   * Validate specific fields and scroll to first error if validation fails
   */
  const validateFields = useCallback(async (
    fieldNames: (keyof AuthFormValues)[]
  ): Promise<boolean> => {
    const isValid = await trigger(fieldNames);
    
    if (!isValid) {
      scrollToFirstError(errors as FieldErrors, scrollContainerRef);
    }
    
    return isValid;
  }, [trigger, errors, scrollContainerRef]);

  /**
   * Clear all form values and reset to defaults
   */
  const resetForm = useCallback(() => {
    form.reset(defaultFormValues);
  }, [form]);

  /**
   * Get validation schema for a specific step
   */
  const getStepSchema = useCallback((
    stepName: StepName,
    accountType?: "professional" | "salon" | "student" | null
  ): z.ZodSchema => {
    if (stepName === "license" && accountType === "salon") {
      return stepSchemas["license-salon"];
    }
    return stepSchemas[stepName];
  }, []);

  return {
    form,
    validateStep,
    validateFields,
    resetForm,
    getStepSchema,
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
  };
}

/**
 * Hook for sign-in form specifically
 */
export function useSignInForm(options: UseAuthFormOptions = {}) {
  const { scrollContainerRef } = options;
  
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const validateAndScrollToError = useCallback(async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (!isValid) {
      scrollToFirstError(form.formState.errors, scrollContainerRef);
    }
    return isValid;
  }, [form, scrollContainerRef]);

  return {
    form,
    validateAndScrollToError,
  };
}

/**
 * Hook for forgot password form specifically
 */
export function useForgotPasswordForm(options: UseAuthFormOptions = {}) {
  const { scrollContainerRef } = options;
  
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onBlur",
  });

  const validateAndScrollToError = useCallback(async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (!isValid) {
      scrollToFirstError(form.formState.errors, scrollContainerRef);
    }
    return isValid;
  }, [form, scrollContainerRef]);

  return {
    form,
    validateAndScrollToError,
  };
}
