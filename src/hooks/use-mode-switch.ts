import { useRef, useCallback } from "react";
import type { AuthMode, Step, BusinessOperationType } from "@/types/auth";

interface SignupState {
  step: Step;
  accountType: string | null;
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
  businessOperationType: BusinessOperationType;
  licenseProofFiles: File[];
  completedSteps: Set<number>;
}

interface SigninState {
  email: string;
  password: string;
}

interface CurrentFormState {
  mode: AuthMode;
  currentStep: Step;
  accountType: string | null;
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
  businessOperationType: BusinessOperationType;
  licenseProofFiles: File[];
  completedSteps: Set<number>;
}

interface FormSetters {
  setMode: (mode: AuthMode) => void;
  setCurrentStep: (step: Step) => void;
  setAccountType: (value: string | null) => void;
  setLicenseNumber: (value: string) => void;
  setState: (value: string) => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setBusinessName: (value: string) => void;
  setBusinessAddress: (value: string) => void;
  setSuiteNumber: (value: string) => void;
  setCountry: (value: string) => void;
  setCity: (value: string) => void;
  setZipCode: (value: string) => void;
  setWholesaleAgreed: (value: boolean) => void;
  setHasTaxExemption: (value: boolean | null) => void;
  setPreferredName: (value: string) => void;
  setPhoneNumber: (value: string) => void;
  setPhoneCountryCode: (value: string) => void;
  setSalonSize: (value: string) => void;
  setSalonStructure: (value: string) => void;
  setLicenseFile: (value: File | null) => void;
  setTaxExemptFile: (value: File | null) => void;
  setSchoolName: (value: string) => void;
  setSchoolState: (value: string) => void;
  setEnrollmentProofFiles: (value: File[]) => void;
  setBusinessOperationType: (value: BusinessOperationType) => void;
  setLicenseProofFiles: (value: File[]) => void;
  setCompletedSteps: (value: Set<number>) => void;
  setTransitionDirection: (direction: "forward" | "backward") => void;
}

interface UseModeSwitchOptions {
  currentState: CurrentFormState;
  setters: FormSetters;
  mainScrollRef: React.RefObject<HTMLElement | null>;
}

export function useModeSwitch({ currentState, setters, mainScrollRef }: UseModeSwitchOptions) {
  // Preserved state refs for mode switching
  const signupStateRef = useRef<SignupState | null>(null);
  const signinStateRef = useRef<SigninState | null>(null);

  const handleModeChange = useCallback(
    (newMode: AuthMode) => {
      const {
        mode,
        currentStep,
        accountType,
        licenseNumber,
        state,
        firstName,
        lastName,
        email,
        password,
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
        licenseFile,
        taxExemptFile,
        schoolName,
        schoolState,
        enrollmentProofFiles,
        businessOperationType,
        licenseProofFiles,
        completedSteps,
      } = currentState;

      // Set transition direction: signin→signup feels like going back, signup→signin feels like going forward
      setters.setTransitionDirection(newMode === "signup" ? "backward" : "forward");

      // Save current mode's state before switching
      if (mode === "signup") {
        signupStateRef.current = {
          step: currentStep,
          accountType,
          licenseNumber,
          state,
          firstName,
          lastName,
          email,
          password,
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
          licenseFile,
          taxExemptFile,
          schoolName,
          schoolState,
          enrollmentProofFiles,
          businessOperationType,
          licenseProofFiles,
          completedSteps,
        };
      } else {
        signinStateRef.current = {
          email,
          password,
        };
      }

      setters.setMode(newMode);

      // Restore the other mode's state if it exists
      if (newMode === "signup" && signupStateRef.current) {
        const saved = signupStateRef.current;
        setters.setCurrentStep(saved.step);
        setters.setAccountType(saved.accountType);
        setters.setLicenseNumber(saved.licenseNumber);
        setters.setState(saved.state);
        setters.setFirstName(saved.firstName);
        setters.setLastName(saved.lastName);
        setters.setEmail(saved.email);
        setters.setPassword(saved.password);
        setters.setBusinessName(saved.businessName);
        setters.setBusinessAddress(saved.businessAddress);
        setters.setSuiteNumber(saved.suiteNumber);
        setters.setCountry(saved.country);
        setters.setCity(saved.city);
        setters.setZipCode(saved.zipCode);
        setters.setWholesaleAgreed(saved.wholesaleAgreed);
        setters.setHasTaxExemption(saved.hasTaxExemption);
        setters.setPreferredName(saved.preferredName);
        setters.setPhoneNumber(saved.phoneNumber);
        setters.setPhoneCountryCode(saved.phoneCountryCode);
        setters.setSalonSize(saved.salonSize);
        setters.setSalonStructure(saved.salonStructure);
        setters.setLicenseFile(saved.licenseFile);
        setters.setTaxExemptFile(saved.taxExemptFile);
        setters.setSchoolName(saved.schoolName);
        setters.setSchoolState(saved.schoolState);
        setters.setEnrollmentProofFiles(saved.enrollmentProofFiles);
        setters.setBusinessOperationType(saved.businessOperationType);
        setters.setLicenseProofFiles(saved.licenseProofFiles);
        setters.setCompletedSteps(saved.completedSteps);
      } else if (newMode === "signin" && signinStateRef.current) {
        const saved = signinStateRef.current;
        setters.setEmail(saved.email);
        setters.setPassword(saved.password);
      } else if (newMode === "signup") {
        // First time switching to signup, reset to defaults
        setters.setCurrentStep("onboarding");
      }

      // Scroll to top when switching modes
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    },
    [currentState, setters, mainScrollRef]
  );

  return {
    handleModeChange,
    signupStateRef,
    signinStateRef,
  };
}
