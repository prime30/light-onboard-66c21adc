import {
  Scissors,
  Building2,
  GraduationCap,
  Tag,
  Headphones,
  Users,
  ShieldCheck,
  FileCheck,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { cn } from "@/lib/utils";
import { AccountType } from "@/lib/validations/auth-schemas";
import { useCallback, useMemo, useState } from "react";
import { Step } from "@/types/auth";
import { createPortal } from "react-dom";
import { dirtyFieldOptions, useForm } from "../context";

type AccountTypeConfirmationOverlayProps = {
  showAccountTypeConfirm: boolean;
  setShowAccountTypeConfirm: (show: boolean) => void;
  pendingAccountType: AccountType | null;
  setPendingAccountType: (type: AccountType | null) => void;
  executeAccountTypeSelect: (type: AccountType | null, previousType: AccountType | null) => void;
  accountType: AccountType | null;
};

function AccountTypeConfirmationOverlay({
  showAccountTypeConfirm,
  setShowAccountTypeConfirm,
  pendingAccountType,
  setPendingAccountType,
  executeAccountTypeSelect,
  accountType,
}: AccountTypeConfirmationOverlayProps) {
  if (!showAccountTypeConfirm) return null;

  const overlay = (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-foreground/50 animate-fade-in" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-background rounded-lg p-4 border border-border/20 shadow-modal animate-scale-in">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Change account type?</p>
            <p className="text-sm text-muted-foreground">
              Selecting a new account type will clear your form progress. Do you wish to proceed?
            </p>
          </div>
          <div className="flex gap-2 w-full mt-3">
            <button
              onClick={() => {
                setShowAccountTypeConfirm(false);
                setPendingAccountType(null);
              }}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
            >
              No, keep current
            </button>
            <button
              onClick={() => {
                const nextType = pendingAccountType;
                setShowAccountTypeConfirm(false);
                setPendingAccountType(null);
                if (nextType) executeAccountTypeSelect(nextType, accountType);
              }}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              Yes, change
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

type RenderAccountTypeProps = {
  id: AccountType;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  features: { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[];
};

export const AccountTypeForm = () => {
  const {
    watch,
    setValue,
    getValidationStatus,
    dirtyFields,
    reset,
    setTransitionDirection,
    setIsTransitioning,
    setCurrentStep,
    getStepNumber,
  } = useForm();

  const validationStatus = getValidationStatus("accountType");
  const [showAccountTypeConfirm, setShowAccountTypeConfirm] = useState(false);
  const [pendingAccountType, setPendingAccountType] = useState<AccountType | null>(null);

  const accountType = watch("accountType");

  const hasFormProgress = useMemo(() => {
    // Check if any fields other than accountType are dirty
    const dirtyFieldKeys = Object.keys(dirtyFields).filter((key) => key !== "accountType");
    return dirtyFieldKeys.length > 0;
  }, [dirtyFields]);

  // Execute account type selection and auto-advance
  const executeAccountTypeSelect = useCallback(
    (type: AccountType | null, previousType: AccountType | null) => {
      setValue("accountType", type, dirtyFieldOptions);
      if (type) {
        // Auto-advance after grace period - navigate directly to next step
        setTimeout(() => {
          // const newTotal = type === "student" ? 7 : type === "professional" ? 9 : 8;
          // setDisplayTotalSteps(newTotal);

          if (previousType !== type && previousType !== null) {
            console.log(previousType, type);
            const firstName = watch("firstName");
            const lastName = watch("lastName");
            const email = watch("email");
            const phoneNumber = watch("phoneNumber");

            reset();

            setValue("accountType", type, dirtyFieldOptions);
            setValue("firstName", firstName, dirtyFieldOptions);
            setValue("lastName", lastName, dirtyFieldOptions);
            setValue("email", email, dirtyFieldOptions);
            setValue("phoneNumber", phoneNumber, dirtyFieldOptions);

            // setCompletedSteps(new Set([1]));
          } else if (previousType !== type) {
            // setCompletedSteps(new Set([1]));
          } else {
            // setCompletedSteps((prev) => new Set([...prev, 1]));
          }

          // Calculate next step based on selected type
          const nextStep: Step =
            type === "student"
              ? "school-info"
              : type === "professional"
                ? "business-operation"
                : "business-location";
          setTransitionDirection("forward");
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentStep(nextStep);
            setIsTransitioning(false);
          }, 150);
        }, 800);
      }
    },
    [setValue, setCurrentStep, setIsTransitioning, watch, reset, setTransitionDirection]
  );

  // Handle account type selection with auto-advance
  const handleAccountTypeSelect = useCallback(
    (type: AccountType | null) => {
      const previousType = accountType;

      // If switching to a different account type and there's existing progress, show confirmation overlay
      if (type && previousType && previousType !== type && hasFormProgress) {
        setPendingAccountType(type);
        setShowAccountTypeConfirm(true);
        return;
      }

      // No existing progress or same type selected, proceed directly
      executeAccountTypeSelect(type, previousType || null);
    },
    [accountType, executeAccountTypeSelect, hasFormProgress]
  );

  const types: RenderAccountTypeProps[] = [
    {
      id: "professional",
      icon: Scissors,
      title: "Licensed stylist",
      description: "Commission, or independent stylist",
      features: [
        { label: "Pro discount", icon: Tag },
        { label: "Priority support", icon: Headphones },
        { label: "Stylist community access", icon: Users },
      ],
    },
    {
      id: "salon",
      icon: Building2,
      title: "Salon owner or manager",
      description: "Business accounts",
      features: [
        { label: "Pro discount", icon: Tag },
        { label: "Top level support", icon: ShieldCheck },
        { label: "Salon leadership community access", icon: Users },
        { label: "Education discounts", icon: GraduationCap },
      ],
    },
    {
      id: "student",
      icon: GraduationCap,
      title: "Cosmetology student or apprentice",
      description: "Currently enrolled",
      features: [
        { label: "Student pricing", icon: Tag },
        { label: "Learning resources", icon: FileCheck },
        { label: "Community access", icon: Users },
      ],
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-[30px]">
      <AccountTypeConfirmationOverlay
        showAccountTypeConfirm={showAccountTypeConfirm}
        setShowAccountTypeConfirm={setShowAccountTypeConfirm}
        pendingAccountType={pendingAccountType}
        setPendingAccountType={setPendingAccountType}
        executeAccountTypeSelect={executeAccountTypeSelect}
        accountType={accountType}
      />
      <div className="space-y-[10px] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber("account-type")}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Tell us who you are
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          Select the account type that fits you best.
        </p>
      </div>

      <div className="space-y-2.5 sm:space-y-[15px]" data-field="account-type">
        {types.map((type, index) => (
          <button
            key={type.id}
            onClick={() => handleAccountTypeSelect(accountType === type.id ? null : type.id)}
            className={cn(
              "relative w-full p-[15px] sm:p-5 rounded-form sm:rounded-[20px] border-2 text-left group overflow-hidden",
              "transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "hover:-translate-y-0.5 active:scale-[0.98]",
              accountType === type.id
                ? "border-foreground/20 bg-foreground/[0.04] shadow-sm"
                : "border-border hover:border-foreground/20 hover:bg-foreground/[0.04] hover:shadow-sm"
            )}
            style={{
              animationDelay: `${index * 0.05}s`,
              transform: accountType === type.id ? "translateY(-2px)" : undefined,
            }}
          >
            <div
              className={cn(
                "absolute top-[15px] sm:top-5 right-[15px] sm:right-5 w-6 h-6 rounded-full bg-foreground flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                accountType === type.id ? "scale-100 opacity-100" : "scale-0 opacity-0"
              )}
            >
              <Check
                className={cn(
                  "w-[14px] h-[14px] text-background transition-transform duration-300 delay-100",
                  accountType === type.id ? "scale-100" : "scale-0"
                )}
                strokeWidth={3}
              />
            </div>

            <div className="relative">
              {/* Top row: Icon + Content */}
              <div className="flex items-start gap-[15px] sm:gap-5">
                {/* Icon with haptic bounce */}
                <div
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-form-sm sm:rounded-form flex items-center justify-center flex-shrink-0 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    accountType === type.id
                      ? "bg-foreground scale-110"
                      : "bg-muted group-hover:scale-105 group-hover:bg-muted/60"
                  )}
                >
                  <type.icon
                    className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300",
                      accountType === type.id
                        ? "text-background scale-110"
                        : "text-foreground group-hover:scale-105"
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0 pr-8">
                  <p
                    className={cn(
                      "text-sm sm:text-base font-medium text-foreground transition-all duration-300",
                      accountType === type.id && "translate-x-0.5"
                    )}
                  >
                    {type.title}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{type.description}</p>
                  {/* Features - inline on desktop */}
                  <div className="hidden sm:flex flex-wrap gap-[5px] mt-2.5">
                    {type.features.map((feature, i) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <span
                          key={i}
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-2.5 py-[5px] rounded-full transition-all duration-300",
                            accountType === type.id
                              ? "bg-foreground/8 text-foreground/70"
                              : "bg-muted text-muted-foreground"
                          )}
                          style={{
                            transitionDelay: `${i * 50}ms`,
                          }}
                        >
                          {FeatureIcon && <FeatureIcon className="w-3 h-3" />}
                          {feature.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Features - Full width row on mobile */}
              <div className="flex sm:hidden flex-wrap gap-[5px] mt-3 pt-3 border-t border-border/40">
                {type.features.map((feature, i) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <span
                      key={i}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] px-2.5 py-[5px] rounded-full transition-all duration-300",
                        accountType === type.id
                          ? "bg-foreground/5 text-foreground/70"
                          : "bg-muted text-muted-foreground"
                      )}
                      style={{
                        transitionDelay: `${i * 50}ms`,
                      }}
                    >
                      {FeatureIcon && <FeatureIcon className="w-3 h-3" />}
                      {feature.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Non-professional link */}
      <p className="text-center text-xs text-muted-foreground">
        Not a professional? Find a stylist/retailer{" "}
        <a
          href="#"
          className="inline-flex items-center gap-1 text-foreground font-medium underline underline-offset-2 hover:text-foreground/80 transition-all duration-200 group"
        >
          here
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </p>
    </div>
  );
};
