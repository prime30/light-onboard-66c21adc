import { getStepOrder } from "@/data/step-order";
import { useToast } from "@/hooks/use-toast";
import {
  accountTypeSchema,
  businessLocationSchema,
  businessOperationSchema,
  contactBasicsSchema,
  licenseSchema,
  preferencesSchema,
  RegistrationFormData,
  schoolInfoSchema,
  taxExemptionSchema,
  wholesaleTermsSchema,
} from "@/lib/validations/auth-schemas";
import { AccountType, AuthMode, Step } from "@/types/auth";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import z, { ZodObject } from "zod";

const stepValidations: Record<Step, ZodObject | null> = {
  reviews: null,
  onboarding: null,
  "account-type": accountTypeSchema,
  "contact-basics": contactBasicsSchema,
  license: licenseSchema,
  "business-operation": businessOperationSchema,
  "business-location": businessLocationSchema,
  "school-info": schoolInfoSchema,
  "wholesale-terms": wholesaleTermsSchema,
  "tax-exemption": taxExemptionSchema,
  "contact-info": preferencesSchema,
  summary: null,
  success: null,
};

type useStepProps = {
  watch: ReturnType<typeof useForm<RegistrationFormData>>["watch"];
};

export function useStep({ watch }: useStepProps) {
  const accountType = watch("accountType");
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("onboarding");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward">("forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const steps = useMemo(() => {
    const newSteps = getStepOrder(accountType).slice();
    newSteps.unshift("onboarding");
    newSteps.push("summary");
    return newSteps;
  }, [accountType]);
  const totalSteps = steps.length;

  const currentStepNumber = steps.indexOf(currentStep);

  const goToNextStep = () => {
    console.log("goNext");

    const schema = stepValidations[currentStep];
    if (schema) {
      // Perform validation using the corresponding Zod schema
      const result = schema.safeParse(watch());

      if (!result.success) {
        console.log("Validation errors:", z.treeifyError(result.error));
        setShowValidationErrors(true);
        toast({
          title: "Please complete all required fields",
          variant: "destructive",
        });
        return;
      }
    }

    // Mark current step as completed
    setCompletedSteps((prev) => prev.add(currentStepNumber));
    const nextStep = steps[currentStepNumber + 1] || currentStep;
    setCurrentStep(nextStep);

    // // Calculate next step for skeleton
    // if (currentStep === "summary") {
    //   // Submit the application using the real auth service
    //   handleSignUpSubmit();
    //   return;
    // } else {
    setTransitionDirection("forward");
    setIsTransitioning(true);
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      setIsTransitioning(false);
    }, 150);
    // }
  };

  return {
    mode,
    setMode,
    totalSteps,
    currentStep,
    setCurrentStep,
    goToNextStep,
    showValidationErrors,
    isTransitioning,
    setIsTransitioning,
    transitionDirection,
    setTransitionDirection,
    mainScrollRef,
  };
}
