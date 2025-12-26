import { Building2, Users, Check, Headphones, Tag } from "lucide-react";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { cn } from "@/lib/utils";
import { dirtyFieldOptions, useForm, ValidFieldNames } from "../context";
import { Step } from "@/types/auth";

const STEP: Step = "business-operation";
const fieldName: ValidFieldNames = "businessOperationType";

export const BusinessOperationStep = () => {
  const {
    getStepValidationStatus,
    setTransitionDirection,
    setIsTransitioning,
    setCurrentStep,
    setValue,
    watch,
  } = useForm();

  const validationStatus = getStepValidationStatus(STEP);
  const businessOperationType = watch(fieldName);

  // Handle business operation type selection with auto-advance
  const onBusinessOperationTypeChange = (type: "commission" | "independent") => {
    // Deselect if the same option is clicked
    if (type === businessOperationType) {
      setValue(fieldName, null, dirtyFieldOptions);
      return;
    }

    setValue(fieldName, type, dirtyFieldOptions);

    // Auto-advance after grace period
    setTimeout(() => {
      setTransitionDirection("forward");
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep("contact-basics");
        setIsTransitioning(false);
      }, 150);
    }, 800);
  };

  const options = [
    {
      id: "commission" as const,
      icon: Building2,
      title: "Commission-based",
      description: "Work at a salon and earn commission",
      features: [
        { label: "Salon employment", icon: Building2 },
        { label: "Team environment", icon: Users },
      ],
    },
    {
      id: "independent" as const,
      icon: Users,
      title: "Independent",
      description: "Booth rental or self-employed stylist",
      features: [
        { label: "Self-employed", icon: Tag },
        { label: "Flexible schedule", icon: Headphones },
      ],
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-[30px]">
      <div className="space-y-[10px] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step 2
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          How do you operate?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          Tell us about your work arrangement.
        </p>
      </div>

      <div className="space-y-2.5 sm:space-y-[15px]" data-field="business-operation">
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => onBusinessOperationTypeChange(option.id)}
            className={cn(
              "relative w-full p-[15px] sm:p-5 rounded-form sm:rounded-[20px] border-2 text-left group overflow-hidden",
              "transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "hover:-translate-y-0.5 active:scale-[0.98]",
              businessOperationType === option.id
                ? "border-foreground/20 bg-foreground/[0.04] shadow-sm"
                : "border-border hover:border-foreground/20 hover:bg-foreground/[0.04] hover:shadow-sm"
            )}
            style={{
              animationDelay: `${index * 0.05}s`,
              transform: businessOperationType === option.id ? "translateY(-2px)" : undefined,
            }}
          >
            <div
              className={cn(
                "absolute top-[15px] sm:top-5 right-[15px] sm:right-5 w-6 h-6 rounded-full bg-foreground flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                businessOperationType === option.id ? "scale-100 opacity-100" : "scale-0 opacity-0"
              )}
            >
              <Check
                className={cn(
                  "w-[14px] h-[14px] text-background transition-transform duration-300 delay-100",
                  businessOperationType === option.id ? "scale-100" : "scale-0"
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
                    businessOperationType === option.id
                      ? "bg-foreground scale-110"
                      : "bg-muted group-hover:scale-105 group-hover:bg-muted/60"
                  )}
                >
                  <option.icon
                    className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300",
                      businessOperationType === option.id
                        ? "text-background scale-110"
                        : "text-foreground group-hover:scale-105"
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0 pr-8">
                  <p
                    className={cn(
                      "text-sm sm:text-base font-medium text-foreground transition-all duration-300",
                      businessOperationType === option.id && "translate-x-0.5"
                    )}
                  >
                    {option.title}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{option.description}</p>
                  {/* Features - inline on desktop */}
                  <div className="hidden sm:flex flex-wrap gap-[5px] mt-2.5">
                    {option.features.map((feature, i) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <span
                          key={i}
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-2.5 py-[5px] rounded-full transition-all duration-300",
                            businessOperationType === option.id
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
                {option.features.map((feature, i) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <span
                      key={i}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] px-2.5 py-[5px] rounded-full transition-all duration-300",
                        businessOperationType === option.id
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
    </div>
  );
};
