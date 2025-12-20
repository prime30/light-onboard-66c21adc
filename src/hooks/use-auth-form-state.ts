import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { AuthMode, Step, AccountType, BusinessOperationType } from "@/types/auth";
import { isValidEmail } from "@/lib/validations/form-utils";
import { isValidPhoneNumber } from "@/components/registration/steps/ContactBasicsStep";
import { getStepOrder } from "@/hooks/use-step-navigation";

// Session storage key for form persistence
const STORAGE_KEY = "auth_form_progress";

export interface FormState {
  // Auth mode
  mode: AuthMode;
  // Current step
  currentStep: Step;
  currentSlide: number;
  displayTotalSteps: number;
  
  // Account info
  accountType: string | null;
  
  // Contact basics
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  password: string;
  phoneNumber: string;
  phoneCountryCode: string;
  
  // Business location
  businessName: string;
  businessAddress: string;
  suiteNumber: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Salon-specific
  salonSize: string;
  salonStructure: string;
  licenseNumber: string;
  licenseFile: File | null;
  
  // Student-specific
  schoolName: string;
  schoolState: string;
  enrollmentProofFiles: File[];
  
  // Professional-specific
  businessOperationType: BusinessOperationType | null;
  licenseProofFiles: File[];
  
  // Tax & terms
  hasTaxExemption: boolean | null;
  taxExemptFile: File | null;
  wholesaleAgreed: boolean;
  
  // Profile (optional)
  birthdayMonth: string;
  birthdayDay: string;
  socialMediaHandle: string;
  referralSource: string;
  
  // Subscriptions
  subscribeOrderUpdates: boolean;
  subscribeMarketing: boolean;
  subscribePromotions: boolean;
  
  // UI state
  showValidationErrors: boolean;
  isSubmitting: boolean;
  showForgotPassword: boolean;
  isSendingReset: boolean;
  completedSteps: Set<number>;
}

export interface FormActions {
  setMode: (mode: AuthMode) => void;
  setCurrentStep: (step: Step) => void;
  setCurrentSlide: React.Dispatch<React.SetStateAction<number>>;
  setDisplayTotalSteps: (total: number) => void;
  setAccountType: (type: string | null) => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setPreferredName: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setPhoneNumber: (value: string) => void;
  setPhoneCountryCode: (value: string) => void;
  setBusinessName: (value: string) => void;
  setBusinessAddress: (value: string) => void;
  setSuiteNumber: (value: string) => void;
  setCountry: (value: string) => void;
  setCity: (value: string) => void;
  setState: (value: string) => void;
  setZipCode: (value: string) => void;
  setSalonSize: (value: string) => void;
  setSalonStructure: (value: string) => void;
  setLicenseNumber: (value: string) => void;
  setLicenseFile: (file: File | null) => void;
  setSchoolName: (value: string) => void;
  setSchoolState: (value: string) => void;
  setEnrollmentProofFiles: (files: File[]) => void;
  setBusinessOperationType: (type: BusinessOperationType | null) => void;
  setLicenseProofFiles: (files: File[]) => void;
  setHasTaxExemption: (value: boolean | null) => void;
  setTaxExemptFile: (file: File | null) => void;
  setWholesaleAgreed: (value: boolean) => void;
  setBirthdayMonth: (value: string) => void;
  setBirthdayDay: (value: string) => void;
  setSocialMediaHandle: (value: string) => void;
  setReferralSource: (value: string) => void;
  setSubscribeOrderUpdates: (value: boolean) => void;
  setSubscribeMarketing: (value: boolean) => void;
  setSubscribePromotions: (value: boolean) => void;
  setShowValidationErrors: (value: boolean) => void;
  setIsSubmitting: (value: boolean) => void;
  setShowForgotPassword: (value: boolean) => void;
  setIsSendingReset: (value: boolean) => void;
  setCompletedSteps: (value: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  resetForm: () => void;
  hasFormProgress: () => boolean;
  // Restore flow
  pendingRestoreStep: Step | null;
  triggerRestoreTransition: () => void;
}

// Preserved state refs for mode switching
interface SignupState {
  step: Step;
  accountType: AccountType | null;
  licenseNumber: string;
  state: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
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
  licenseFile: File | null;
  taxExemptFile: File | null;
  schoolName: string;
  schoolState: string;
  enrollmentProofFiles: File[];
  businessOperationType: BusinessOperationType | null;
  licenseProofFiles: File[];
  completedSteps: Set<number>;
}

interface SigninState {
  email: string;
  password: string;
}

// Calculate completed steps based on form data
const calculateCompletedSteps = (data: {
  accountType: AccountType | null;
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
  businessOperationType: BusinessOperationType | null;
  hasTaxExemption: boolean | null;
  hasTaxExemptFile: boolean;
  wholesaleAgreed: boolean;
}): Set<number> => {
  const completed = new Set<number>();
  
  if (!data.accountType) return completed;
  completed.add(1);
  
  const contactBasicsValid = 
    data.firstName.trim() !== "" && 
    data.lastName.trim() !== "" && 
    isValidEmail(data.email) && 
    isValidPhoneNumber(data.phoneNumber);
  
  const taxExemptionValid = 
    data.hasTaxExemption === false || 
    (data.hasTaxExemption === true && data.hasTaxExemptFile);
  
  if (data.accountType === "student") {
    const schoolInfoValid = 
      data.schoolName.trim() !== "" && 
      data.schoolState !== "" && 
      data.enrollmentProofFilesCount > 0;
    
    if (schoolInfoValid) completed.add(2);
    if (contactBasicsValid) completed.add(3);
    if (taxExemptionValid) completed.add(4);
    if (data.wholesaleAgreed) completed.add(5);
    completed.add(6);
  } else if (data.accountType === "salon") {
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
    completed.add(7);
  } else {
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
    completed.add(8);
  }
  
  return completed;
};

export function useAuthFormState(): FormState & FormActions {
  // Auth mode
  const [mode, setMode] = useState<AuthMode>("signup");
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [displayTotalSteps, setDisplayTotalSteps] = useState(7);
  
  // Account info - use string to allow any account type string from form
  const [accountType, setAccountType] = useState<string | null>(null);
  
  // Contact basics
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  
  // Business location
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [suiteNumber, setSuiteNumber] = useState("");
  const [country, setCountry] = useState("United States");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  
  // Salon-specific
  const [salonSize, setSalonSize] = useState("");
  const [salonStructure, setSalonStructure] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  
  // Student-specific
  const [schoolName, setSchoolName] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [enrollmentProofFiles, setEnrollmentProofFiles] = useState<File[]>([]);
  
  // Professional-specific
  const [businessOperationType, setBusinessOperationType] = useState<BusinessOperationType | null>(null);
  const [licenseProofFiles, setLicenseProofFiles] = useState<File[]>([]);
  
  // Tax & terms
  const [hasTaxExemption, setHasTaxExemption] = useState<boolean | null>(null);
  const [taxExemptFile, setTaxExemptFile] = useState<File | null>(null);
  const [wholesaleAgreed, setWholesaleAgreed] = useState(false);
  
  // Profile (optional)
  const [birthdayMonth, setBirthdayMonth] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("");
  const [socialMediaHandle, setSocialMediaHandle] = useState("");
  const [referralSource, setReferralSource] = useState("");
  
  // Subscriptions
  const [subscribeOrderUpdates, setSubscribeOrderUpdates] = useState(true);
  const [subscribeMarketing, setSubscribeMarketing] = useState(true);
  const [subscribePromotions, setSubscribePromotions] = useState(true);
  
  // UI state
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Restore flow state - track the step we should animate to after showing onboarding
  const [pendingRestoreStep, setPendingRestoreStep] = useState<Step | null>(null);
  
  // Mode switch state preservation refs
  const signupStateRef = useRef<SignupState | null>(null);
  const signinStateRef = useRef<SigninState | null>(null);
  
  // Sync displayTotalSteps with accountType
  useEffect(() => {
    if (!accountType) return;
    setDisplayTotalSteps(accountType === "student" ? 7 : accountType === "professional" ? 9 : 8);
  }, [accountType]);
  
  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        
        // Check if there's meaningful progress to restore
        const hasProgress = data.accountType || data.firstName || data.lastName || 
          data.email || data.businessName || data.licenseNumber;
        
        if (!hasProgress) return;
        
        // Always start on onboarding when restoring
        setCurrentStep("onboarding");
        
        if (data.mode) setMode(data.mode);
        if (data.accountType) setAccountType(data.accountType);
        if (data.licenseNumber) setLicenseNumber(data.licenseNumber);
        if (data.state) setState(data.state);
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.email) setEmail(data.email);
        if (data.businessName) setBusinessName(data.businessName);
        if (data.businessAddress) setBusinessAddress(data.businessAddress);
        if (data.suiteNumber) setSuiteNumber(data.suiteNumber);
        if (data.country) setCountry(data.country);
        if (data.city) setCity(data.city);
        if (data.zipCode) setZipCode(data.zipCode);
        if (data.wholesaleAgreed !== undefined) setWholesaleAgreed(data.wholesaleAgreed);
        if (data.hasTaxExemption !== undefined) setHasTaxExemption(data.hasTaxExemption);
        if (data.preferredName) setPreferredName(data.preferredName);
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
        if (data.phoneCountryCode) setPhoneCountryCode(data.phoneCountryCode);
        if (data.salonSize) setSalonSize(data.salonSize);
        if (data.salonStructure) setSalonStructure(data.salonStructure);
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.schoolState) setSchoolState(data.schoolState);
        if (data.businessOperationType) setBusinessOperationType(data.businessOperationType);
        if (data.birthdayMonth) setBirthdayMonth(data.birthdayMonth);
        if (data.birthdayDay) setBirthdayDay(data.birthdayDay);
        if (data.socialMediaHandle) setSocialMediaHandle(data.socialMediaHandle);
        if (data.referralSource) setReferralSource(data.referralSource);
        
        const recalculatedSteps = calculateCompletedSteps({
          accountType: data.accountType || null,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          businessName: data.businessName || "",
          businessAddress: data.businessAddress || "",
          country: data.country || "",
          city: data.city || "",
          state: data.state || "",
          zipCode: data.zipCode || "",
          licenseNumber: data.licenseNumber || "",
          salonSize: data.salonSize || "",
          salonStructure: data.salonStructure || "",
          schoolName: data.schoolName || "",
          schoolState: data.schoolState || "",
          enrollmentProofFilesCount: 0,
          businessOperationType: data.businessOperationType || null,
          hasTaxExemption: data.hasTaxExemption ?? null,
          hasTaxExemptFile: false,
          wholesaleAgreed: data.wholesaleAgreed || false,
        });
        setCompletedSteps(recalculatedSteps);
        
        // Calculate the first incomplete step to navigate to
        if (data.accountType) {
          const stepOrder = getStepOrder(data.accountType as AccountType);
          // Find first incomplete step (skip account-type since that's step 1 which is complete if we have accountType)
          let targetStep: Step = "account-type";
          
          for (let i = 0; i < stepOrder.length; i++) {
            const stepNum = i + 1;
            if (!recalculatedSteps.has(stepNum)) {
              targetStep = stepOrder[i];
              break;
            }
          }
          
          // If all steps are complete, go to summary
          if (recalculatedSteps.size >= stepOrder.length - 1) {
            targetStep = "summary";
          }
          
          // Set pending restore step and show toast
          setPendingRestoreStep(targetStep);
          
          setTimeout(() => {
            toast("Welcome back!", {
              description: "Your progress has been restored.",
              duration: 4000,
            });
          }, 300);
        }
      }
    } catch (e) {
      console.warn("Failed to load form progress:", e);
    }
  }, []);
  
  // Save to sessionStorage when form state changes
  useEffect(() => {
    if (currentStep === "success") {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    
    try {
      const data = {
        mode,
        currentStep,
        accountType,
        licenseNumber,
        state,
        firstName,
        lastName,
        email,
        businessName,
        businessAddress,
        suiteNumber,
        country,
        city,
        zipCode,
        wholesaleAgreed,
        hasTaxExemption,
        preferredName,
        phoneNumber,
        phoneCountryCode,
        salonSize,
        salonStructure,
        schoolName,
        schoolState,
        businessOperationType,
        birthdayMonth,
        birthdayDay,
        socialMediaHandle,
        referralSource,
        completedSteps: Array.from(completedSteps)
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save form progress:", e);
    }
  }, [
    mode, currentStep, accountType, licenseNumber, state, firstName, lastName, email,
    businessName, businessAddress, suiteNumber, country, city, zipCode, wholesaleAgreed,
    hasTaxExemption, preferredName, phoneNumber, phoneCountryCode, salonSize, salonStructure,
    schoolName, schoolState, businessOperationType, birthdayMonth, birthdayDay, socialMediaHandle, referralSource,
    completedSteps
  ]);
  
  const resetForm = useCallback(() => {
    setCurrentStep("onboarding");
    setAccountType(null);
    setLicenseNumber("");
    setState("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setBusinessName("");
    setBusinessAddress("");
    setSuiteNumber("");
    setCountry("United States");
    setCity("");
    setZipCode("");
    setWholesaleAgreed(false);
    setHasTaxExemption(null);
    setPreferredName("");
    setPhoneNumber("");
    setPhoneCountryCode("+1");
    setSalonSize("");
    setSalonStructure("");
    setLicenseFile(null);
    setTaxExemptFile(null);
    setSchoolName("");
    setSchoolState("");
    setEnrollmentProofFiles([]);
    setBusinessOperationType(null);
    setLicenseProofFiles([]);
    setSubscribeOrderUpdates(true);
    setSubscribeMarketing(true);
    setSubscribePromotions(true);
    setShowValidationErrors(false);
    setCompletedSteps(new Set());
  }, []);
  
  const hasFormProgress = useCallback(() => {
    return (
      firstName.trim() !== "" ||
      lastName.trim() !== "" ||
      email.trim() !== "" ||
      phoneNumber.trim() !== "" ||
      businessName.trim() !== "" ||
      businessAddress.trim() !== "" ||
      licenseNumber.trim() !== "" ||
      schoolName.trim() !== "" ||
      wholesaleAgreed ||
      hasTaxExemption !== null ||
      businessOperationType !== null ||
      completedSteps.size > 1
    );
  }, [firstName, lastName, email, phoneNumber, businessName, businessAddress, licenseNumber, schoolName, wholesaleAgreed, hasTaxExemption, businessOperationType, completedSteps]);
  
  // Trigger restore transition - navigates to pending step and clears it
  const triggerRestoreTransition = useCallback(() => {
    if (pendingRestoreStep) {
      setCurrentStep(pendingRestoreStep);
      setPendingRestoreStep(null);
    }
  }, [pendingRestoreStep]);
  
  return {
    // State
    mode,
    currentStep,
    currentSlide,
    displayTotalSteps,
    accountType,
    firstName,
    lastName,
    preferredName,
    email,
    password,
    phoneNumber,
    phoneCountryCode,
    businessName,
    businessAddress,
    suiteNumber,
    country,
    city,
    state,
    zipCode,
    salonSize,
    salonStructure,
    licenseNumber,
    licenseFile,
    schoolName,
    schoolState,
    enrollmentProofFiles,
    businessOperationType,
    licenseProofFiles,
    hasTaxExemption,
    taxExemptFile,
    wholesaleAgreed,
    birthdayMonth,
    birthdayDay,
    socialMediaHandle,
    referralSource,
    subscribeOrderUpdates,
    subscribeMarketing,
    subscribePromotions,
    showValidationErrors,
    isSubmitting,
    showForgotPassword,
    isSendingReset,
    completedSteps,
    
    // Actions
    setMode,
    setCurrentStep,
    setCurrentSlide,
    setDisplayTotalSteps,
    setAccountType,
    setFirstName,
    setLastName,
    setPreferredName,
    setEmail,
    setPassword,
    setPhoneNumber,
    setPhoneCountryCode,
    setBusinessName,
    setBusinessAddress,
    setSuiteNumber,
    setCountry,
    setCity,
    setState,
    setZipCode,
    setSalonSize,
    setSalonStructure,
    setLicenseNumber,
    setLicenseFile,
    setSchoolName,
    setSchoolState,
    setEnrollmentProofFiles,
    setBusinessOperationType,
    setLicenseProofFiles,
    setHasTaxExemption,
    setTaxExemptFile,
    setWholesaleAgreed,
    setBirthdayMonth,
    setBirthdayDay,
    setSocialMediaHandle,
    setReferralSource,
    setSubscribeOrderUpdates,
    setSubscribeMarketing,
    setSubscribePromotions,
    setShowValidationErrors,
    setIsSubmitting,
    setShowForgotPassword,
    setIsSendingReset,
    setCompletedSteps,
    resetForm,
    hasFormProgress,
    
    // Restore flow
    pendingRestoreStep,
    triggerRestoreTransition,
  };
}
