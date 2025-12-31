import { useMemo, useCallback } from "react";
import { isValidEmail, isValidPhoneNumber } from "@/lib/validations/form-utils";
import type { AuthMode, Step, BusinessOperationType, AccountType } from "@/types/auth";

interface IncompleteStep {
  step: number;
  name: string;
  missingFields: string[];
}

interface FormValidationData {
  mode: AuthMode;
  currentStep: Step;
  accountType: AccountType | null;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  businessName: string;
  businessAddress: string;
  countryCode: string;
  city: string;
  provinceCode: string;
  zipCode: string;
  licenseNumber: string;
  salonSize: string;
  salonStructure: string;
  schoolName: string;
  schoolState: string;
  enrollmentProofFiles: File[];
  businessOperationType: BusinessOperationType | null;
  hasTaxExemption: boolean | null;
  taxExemptFile: File | null;
  wholesaleAgreed: boolean;
}

export function useFormValidation(data: FormValidationData) {
  const {
    mode,
    currentStep,
    accountType,
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    businessName,
    businessAddress,
    countryCode,
    city,
    provinceCode,
    zipCode,
    licenseNumber,
    salonSize,
    salonStructure,
    schoolName,
    schoolState,
    enrollmentProofFiles,
    businessOperationType,
    hasTaxExemption,
    taxExemptFile,
    wholesaleAgreed,
  } = data;

  // Check if ALL steps in the form are valid (for final submission)
  const isAllStepsValid = useCallback((): boolean => {
    if (mode === "signin") {
      return isValidEmail(email) && password.length >= 8;
    }

    // Must have account type selected
    if (!accountType) return false;

    // Contact basics validation (required for all flows)
    const contactBasicsValid =
      firstName.trim() !== "" &&
      lastName.trim() !== "" &&
      isValidEmail(email) &&
      isValidPhoneNumber(phoneNumber);

    // Student flow - 6 steps (account-type, school-info, contact-basics, tax-exemption, wholesale-terms, contact-info)
    if (accountType === "student") {
      const schoolValid =
        schoolName.trim() !== "" && schoolState !== "" && enrollmentProofFiles.length > 0;
      const wholesaleValid = wholesaleAgreed;
      const taxValid =
        hasTaxExemption === false || (hasTaxExemption === true && taxExemptFile !== null);
      return schoolValid && contactBasicsValid && wholesaleValid && taxValid;
    }

    // Salon flow - 7 steps
    if (accountType === "salon") {
      const licenseValid = licenseNumber.trim() !== "" && salonSize !== "" && salonStructure !== "";
      const businessValid =
        businessName.trim() !== "" &&
        businessAddress.trim() !== "" &&
        countryCode !== "" &&
        city.trim() !== "" &&
        provinceCode !== "" &&
        zipCode.trim() !== "";
      const wholesaleValid = wholesaleAgreed;
      const taxValid =
        hasTaxExemption === false || (hasTaxExemption === true && taxExemptFile !== null);
      return licenseValid && businessValid && contactBasicsValid && wholesaleValid && taxValid;
    }

    // Professional flow - 8 steps
    const licenseValid = licenseNumber.trim() !== "";
    const businessOperationValid = businessOperationType !== null;
    const businessValid =
      businessName.trim() !== "" &&
      businessAddress.trim() !== "" &&
      countryCode !== "" &&
      city.trim() !== "" &&
      provinceCode !== "" &&
      zipCode.trim() !== "";
    const wholesaleValid = wholesaleAgreed;
    const taxValid =
      hasTaxExemption === false || (hasTaxExemption === true && taxExemptFile !== null);
    return (
      licenseValid &&
      businessOperationValid &&
      businessValid &&
      contactBasicsValid &&
      wholesaleValid &&
      taxValid
    );
  }, [
    mode,
    email,
    password,
    accountType,
    firstName,
    lastName,
    phoneNumber,
    schoolName,
    schoolState,
    enrollmentProofFiles,
    wholesaleAgreed,
    hasTaxExemption,
    taxExemptFile,
    licenseNumber,
    salonSize,
    salonStructure,
    businessName,
    businessAddress,
    countryCode,
    city,
    provinceCode,
    zipCode,
    businessOperationType,
  ]);

  // Get list of incomplete steps for tooltip display
  const getIncompleteSteps = useCallback((): IncompleteStep[] => {
    if (mode !== "signup") return [];
    const incomplete: IncompleteStep[] = [];

    // Step 1: Account Type - check if selected
    if (!accountType) {
      incomplete.push({
        step: 1,
        name: "Account type",
        missingFields: ["Select account type"],
      });
      // Can't determine other steps without account type, return early
      return incomplete;
    }

    if (accountType === "student") {
      // Student flow: account-type, school-info, contact-basics, tax-exemption, wholesale-terms, contact-info
      // Step 2: School Info
      const schoolMissing: string[] = [];
      if (schoolName.trim() === "") schoolMissing.push("School name");
      if (schoolState === "") schoolMissing.push("State/province");
      if (enrollmentProofFiles.length === 0) schoolMissing.push("Enrollment proof");
      if (schoolMissing.length > 0) {
        incomplete.push({
          step: 2,
          name: "School information",
          missingFields: schoolMissing,
        });
      }
      // Step 3: Contact Basics
      const studentContactBasicsMissing: string[] = [];
      if (firstName.trim() === "") studentContactBasicsMissing.push("First name");
      if (lastName.trim() === "") studentContactBasicsMissing.push("Last name");
      if (!isValidEmail(email)) studentContactBasicsMissing.push("Email");
      if (!isValidPhoneNumber(phoneNumber)) studentContactBasicsMissing.push("Phone number");
      if (studentContactBasicsMissing.length > 0) {
        incomplete.push({
          step: 3,
          name: "Contact information",
          missingFields: studentContactBasicsMissing,
        });
      }
      // Step 4: Tax Exemption
      const studentTaxMissing: string[] = [];
      if (hasTaxExemption === null) studentTaxMissing.push("Exemption status");
      else if (hasTaxExemption === true && !taxExemptFile) studentTaxMissing.push("Tax document");
      if (studentTaxMissing.length > 0) {
        incomplete.push({
          step: 4,
          name: "Tax exemption",
          missingFields: studentTaxMissing,
        });
      }
      // Step 5: Wholesale Terms
      if (!wholesaleAgreed) {
        incomplete.push({
          step: 5,
          name: "Wholesale terms",
          missingFields: ["Terms agreement"],
        });
      }
      // Step 6: Preferences and Details (all optional)
      return incomplete;
    }

    if (accountType === "salon") {
      // Salon flow: account-type, business-location, contact-basics, license, tax-exemption, wholesale-terms, contact-info
      // Step 2: Business Location
      const locationMissing: string[] = [];
      if (businessName.trim() === "") locationMissing.push("Business name");
      if (businessAddress.trim() === "") locationMissing.push("Address");
      if (countryCode === "") locationMissing.push("Country");
      if (city.trim() === "") locationMissing.push("City");
      if (provinceCode === "") locationMissing.push("State/province");
      if (zipCode.trim() === "") locationMissing.push("ZIP code");
      if (locationMissing.length > 0) {
        incomplete.push({
          step: 2,
          name: "Business location",
          missingFields: locationMissing,
        });
      }
      // Step 3: Contact Basics
      const salonContactBasicsMissing: string[] = [];
      if (firstName.trim() === "") salonContactBasicsMissing.push("First name");
      if (lastName.trim() === "") salonContactBasicsMissing.push("Last name");
      if (!isValidEmail(email)) salonContactBasicsMissing.push("Email");
      if (!isValidPhoneNumber(phoneNumber)) salonContactBasicsMissing.push("Phone number");
      if (salonContactBasicsMissing.length > 0) {
        incomplete.push({
          step: 3,
          name: "Contact information",
          missingFields: salonContactBasicsMissing,
        });
      }
      // Step 4: License
      const licenseMissing: string[] = [];
      if (licenseNumber.trim() === "") licenseMissing.push("License number");
      if (salonSize === "") licenseMissing.push("Salon size");
      if (salonStructure === "") licenseMissing.push("Salon structure");
      if (licenseMissing.length > 0) {
        incomplete.push({
          step: 4,
          name: "License verification",
          missingFields: licenseMissing,
        });
      }
      // Step 5: Tax Exemption
      const taxMissing: string[] = [];
      if (hasTaxExemption === null) taxMissing.push("Exemption status");
      else if (hasTaxExemption === true && !taxExemptFile) taxMissing.push("Tax document");
      if (taxMissing.length > 0) {
        incomplete.push({
          step: 5,
          name: "Tax exemption",
          missingFields: taxMissing,
        });
      }
      // Step 6: Wholesale Terms
      if (!wholesaleAgreed) {
        incomplete.push({
          step: 6,
          name: "Wholesale terms",
          missingFields: ["Terms agreement"],
        });
      }
      // Step 7: Preferences and Details (all optional)
      return incomplete;
    }

    // Professional flow: account-type, business-operation, contact-basics, license, business-location, tax-exemption, wholesale-terms, contact-info
    // Step 2: Business Operation
    if (businessOperationType === null) {
      incomplete.push({
        step: 2,
        name: "Business operation",
        missingFields: ["Operation type"],
      });
    }
    // Step 3: Contact Basics
    const proContactBasicsMissing: string[] = [];
    if (firstName.trim() === "") proContactBasicsMissing.push("First name");
    if (lastName.trim() === "") proContactBasicsMissing.push("Last name");
    if (!isValidEmail(email)) proContactBasicsMissing.push("Email");
    if (!isValidPhoneNumber(phoneNumber)) proContactBasicsMissing.push("Phone number");
    if (proContactBasicsMissing.length > 0) {
      incomplete.push({
        step: 3,
        name: "Contact information",
        missingFields: proContactBasicsMissing,
      });
    }
    // Step 4: Business Location
    const proLocationMissing: string[] = [];
    if (businessName.trim() === "") proLocationMissing.push("Business name");
    if (businessAddress.trim() === "") proLocationMissing.push("Address");
    if (countryCode === "") proLocationMissing.push("Country");
    if (city.trim() === "") proLocationMissing.push("City");
    if (provinceCode === "") proLocationMissing.push("State/province");
    if (zipCode.trim() === "") proLocationMissing.push("ZIP code");
    if (proLocationMissing.length > 0) {
      incomplete.push({
        step: 4,
        name: "Business location",
        missingFields: proLocationMissing,
      });
    }
    // Step 5: License
    if (licenseNumber.trim() === "") {
      incomplete.push({
        step: 5,
        name: "License verification",
        missingFields: ["License number"],
      });
    }
    // Step 6: Tax Exemption
    const proTaxMissing: string[] = [];
    if (hasTaxExemption === null) proTaxMissing.push("Exemption status");
    else if (hasTaxExemption === true && !taxExemptFile) proTaxMissing.push("Tax document");
    if (proTaxMissing.length > 0) {
      incomplete.push({
        step: 6,
        name: "Tax exemption",
        missingFields: proTaxMissing,
      });
    }
    // Step 7: Wholesale Terms
    if (!wholesaleAgreed) {
      incomplete.push({
        step: 7,
        name: "Wholesale terms",
        missingFields: ["Terms agreement"],
      });
    }
    // Step 8: Preferences and Details (all optional)
    return incomplete;
  }, [
    mode,
    accountType,
    schoolName,
    schoolState,
    enrollmentProofFiles,
    firstName,
    lastName,
    email,
    phoneNumber,
    hasTaxExemption,
    taxExemptFile,
    wholesaleAgreed,
    businessName,
    businessAddress,
    countryCode,
    city,
    provinceCode,
    zipCode,
    licenseNumber,
    salonSize,
    salonStructure,
    businessOperationType,
  ]);

  // Check if form is ready to submit (on final step with all fields complete)
  const isFormReadyToSubmit = useMemo(() => {
    return mode === "signup" && currentStep === "summary" && isAllStepsValid();
  }, [mode, currentStep, isAllStepsValid]);

  // Calculate overall form progress as percentage
  const getFormProgress = useCallback((): number => {
    if (mode === "signin") {
      let filled = 0;
      if (email.trim() !== "") filled++;
      if (password.length >= 8) filled++;
      return (filled / 2) * 100;
    }

    // For signup, calculate based on account type - must match isAllStepsValid logic exactly
    if (accountType === "student") {
      // Student: accountType (1), school-info (3), contact-basics (4), tax (1-2), wholesale (1)
      let filled = 0;
      let total = 10;
      if (accountType) filled++;
      if (schoolName.trim() !== "") filled++;
      if (schoolState !== "") filled++;
      if (enrollmentProofFiles.length > 0) filled++;
      if (firstName.trim() !== "") filled++;
      if (lastName.trim() !== "") filled++;
      if (email.trim() !== "") filled++;
      if (phoneNumber.trim() !== "" && phoneNumber.replace(/\D/g, "").length >= 10) filled++;
      if (hasTaxExemption !== null) filled++;
      if (hasTaxExemption === true) {
        total = 11;
        if (taxExemptFile) filled++;
      }
      if (wholesaleAgreed) filled++;
      return (filled / total) * 100;
    }

    if (accountType === "salon") {
      // Salon: accountType (1), business location (6), contact-basics (4), license (3), tax (1-2), wholesale (1)
      let filled = 0;
      let total = 16;
      if (accountType) filled++;
      if (businessName.trim() !== "") filled++;
      if (businessAddress.trim() !== "") filled++;
      if (countryCode !== "") filled++;
      if (city.trim() !== "") filled++;
      if (provinceCode !== "") filled++;
      if (zipCode.trim() !== "") filled++;
      if (firstName.trim() !== "") filled++;
      if (lastName.trim() !== "") filled++;
      if (email.trim() !== "") filled++;
      if (phoneNumber.trim() !== "" && phoneNumber.replace(/\D/g, "").length >= 10) filled++;
      if (licenseNumber.trim() !== "") filled++;
      if (salonSize !== "") filled++;
      if (salonStructure !== "") filled++;
      if (hasTaxExemption !== null) filled++;
      if (hasTaxExemption === true) {
        total = 17;
        if (taxExemptFile) filled++;
      }
      if (wholesaleAgreed) filled++;
      return (filled / total) * 100;
    }

    // Professional (stylist): accountType (1), businessOperation (1), contact-basics (4),
    // license (1), business location (6), tax (1-2), wholesale (1)
    let filled = 0;
    let total = 15;
    if (accountType) filled++;
    if (businessOperationType !== null) filled++;
    if (firstName.trim() !== "") filled++;
    if (lastName.trim() !== "") filled++;
    if (email.trim() !== "") filled++;
    if (phoneNumber.trim() !== "" && phoneNumber.replace(/\D/g, "").length >= 10) filled++;
    if (licenseNumber.trim() !== "") filled++;
    if (businessName.trim() !== "") filled++;
    if (businessAddress.trim() !== "") filled++;
    if (countryCode !== "") filled++;
    if (city.trim() !== "") filled++;
    if (provinceCode !== "") filled++;
    if (zipCode.trim() !== "") filled++;
    if (hasTaxExemption !== null) filled++;
    if (hasTaxExemption === true) {
      total = 16;
      if (taxExemptFile) filled++;
    }
    if (wholesaleAgreed) filled++;
    return (filled / total) * 100;
  }, [
    mode,
    email,
    password,
    accountType,
    schoolName,
    schoolState,
    enrollmentProofFiles,
    firstName,
    lastName,
    phoneNumber,
    hasTaxExemption,
    taxExemptFile,
    wholesaleAgreed,
    businessName,
    businessAddress,
    countryCode,
    city,
    provinceCode,
    zipCode,
    licenseNumber,
    salonSize,
    salonStructure,
    businessOperationType,
  ]);

  return {
    isAllStepsValid,
    getIncompleteSteps,
    isFormReadyToSubmit,
    getFormProgress,
  };
}
