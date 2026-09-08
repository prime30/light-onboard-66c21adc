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
  UserX,
  
  
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AccountType } from "@/lib/validations/auth-schemas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { dirtyFieldOptions, useForm } from "../context";
import { useGeoCountry } from "@/hooks/useGeoCountry";

type AccountTypeConfirmationOverlayProps = {
  showAccountTypeConfirm: boolean;
  setShowAccountTypeConfirm: (show: boolean) => void;
  pendingAccountType: AccountType | null;
  setPendingAccountType: (type: AccountType | null) => void;
  executeAccountTypeSelect: (type: AccountType | null, previousType: AccountType | null) => void;
  accountType: AccountType | null;
  goToNextStep?: () => void;
};

function AccountTypeConfirmationOverlay({
  showAccountTypeConfirm,
  setShowAccountTypeConfirm,
  pendingAccountType,
  setPendingAccountType,
  executeAccountTypeSelect,
  accountType,
  goToNextStep,
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
                if (nextType) {
                  executeAccountTypeSelect(nextType, accountType);
                  goToNextStep?.();
                }
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

export const AccountTypeForm = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const {
    watch,
    setValue,
    getValidationStatus,
    dirtyFields,
    reset,
    goToNextStep,
  } = useForm();

  
  const [showAccountTypeConfirm, setShowAccountTypeConfirm] = useState(false);
  const [pendingAccountType, setPendingAccountType] = useState<AccountType | null>(null);
  const [showNotStylist, setShowNotStylist] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const geoCountry = useGeoCountry();
  const currentCountry = watch("countryCode");
  const effectiveCountry = (currentCountry || geoCountry || "US").toUpperCase();
  const isAU = effectiveCountry === "AU";

  // Seed the form's countryCode from geo detection once, if the user hasn't set one.
  useEffect(() => {
    if (!currentCountry && geoCountry) {
      setValue("countryCode", geoCountry, dirtyFieldOptions);
    }
  }, [currentCountry, geoCountry, setValue]);

  const accountType = watch("accountType");

  const hasFormProgress = useMemo(() => {
    // Check if any fields other than accountType are dirty
    const dirtyFieldKeys = Object.keys(dirtyFields).filter((key) => key !== "accountType");
    return dirtyFieldKeys.length > 0;
  }, [dirtyFields]);

  // Update the selected account type without navigating. The shared footer's
  // Continue action owns forward navigation; the old delayed auto-advance
  // could fire after Continue and jump over Contact Information.
  const executeAccountTypeSelect = useCallback(
    (type: AccountType | null, previousType: AccountType | null) => {
      setValue("accountType", type, dirtyFieldOptions);
      if (type && previousType !== type && previousType !== null) {
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
      }
    },
    [setValue, watch, reset]
  );

  // Auto-advance is deferred to an effect: the dynamic step list is derived
  // from accountType, so calling goToNextStep() in the same tick would use the
  // stale one-item step list and jump straight to the summary.
  const [pendingAdvance, setPendingAdvance] = useState(false);

  useEffect(() => {
    if (!pendingAdvance) return;
    if (!accountType) return;
    setPendingAdvance(false);
    goToNextStep();
  }, [pendingAdvance, accountType, goToNextStep]);

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
      if (type && !embedded) {
        setPendingAdvance(true);
      }
    },
    [accountType, executeAccountTypeSelect, hasFormProgress, embedded]
  );


  const types: RenderAccountTypeProps[] = [
    {
      id: "professional",
      icon: Scissors,
      title: isAU ? "Professional stylist" : "Licensed stylist",
      description: isAU
        ? "Salon-employed, mobile, or independent"
        : "Commission, or independent stylist",
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
      title: isAU ? "Student or apprentice" : "Cosmetology student or apprentice",
      description: isAU ? "In training or learnership" : "Currently enrolled",
      features: [
        { label: "Student pricing", icon: Tag },
        { label: "Learning resources", icon: FileCheck },
        { label: "Community access", icon: Users },
      ],
    },
  ];

  const selectedType = useMemo(
    () => types.find((t) => t.id === accountType) ?? null,
    [types, accountType]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (showNotStylist) {
    return (
      <div className="space-y-[clamp(15px,2.5vh,30px)]">
        <div className="pt-[clamp(8px,1.5vh,16px)] space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
          <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
            <UserX className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
              Trade only
            </span>
          </div>
          <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
            {isAU ? "We only sell to trade professionals" : "We only sell to licensed stylists"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed text-balance max-w-md mx-auto">
            Drop Dead is a trade-only brand, so these products are sold to licensed stylists. If
            you have a stylist, ask them about Drop Dead. If not, a salon near you that offers
            extensions can help.
          </p>
        </div>
    );
  }

  return (
    <div className={embedded ? "space-y-2.5" : "space-y-[clamp(12px,2vh,25px)]"}>
      <AccountTypeConfirmationOverlay
        showAccountTypeConfirm={showAccountTypeConfirm}
        setShowAccountTypeConfirm={setShowAccountTypeConfirm}
        pendingAccountType={pendingAccountType}
        setPendingAccountType={setPendingAccountType}
        executeAccountTypeSelect={executeAccountTypeSelect}
        accountType={accountType}
        goToNextStep={goToNextStep}
      />
      {embedded ? (
        <p className="text-sm font-medium text-foreground">Tell us who you are*</p>
      ) : (
        <div className="pt-[clamp(8px,1.5vh,16px)] space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
          <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
            Tell us who you are
          </h1>
        </div>
      )}

      <div className="space-y-2.5" data-field="account-type">
        <div className="relative input-glow input-ripple rounded-form" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={cn(
              "h-input w-full rounded-form bg-muted border border-border/50 px-3 text-left text-sm",
              "flex items-center justify-between gap-2 outline-none transition-all duration-300",
              isOpen && "border-foreground/20 bg-background"
            )}
          >
            <span className={cn("truncate", selectedType ? "text-foreground" : "text-muted-foreground/60")}>
              {selectedType ? selectedType.title : "Select an option..."}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {isOpen && (
            <div
              role="listbox"
              className="absolute z-50 left-0 right-0 mt-[5px] p-1 rounded-form-sm border border-border/60 bg-background shadow-modal animate-fade-in max-h-[50vh] overflow-y-auto"
            >
              {types.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  role="option"
                  aria-selected={accountType === type.id}
                  onClick={() => {
                    setIsOpen(false);
                    handleAccountTypeSelect(type.id);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-form-sm text-left text-sm transition-colors duration-200",
                    accountType === type.id
                      ? "bg-foreground/[0.04] text-foreground"
                      : "text-foreground hover:bg-foreground/[0.025]"
                  )}
                >
                  <span className="truncate">{type.title}</span>
                  {accountType === type.id && (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} />
                  )}
                </button>
              ))}

              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setIsOpen(false);
                  setShowNotStylist(true);
                  const w = typeof window !== "undefined" ? window.innerWidth : 0;
                  const h = typeof window !== "undefined" ? window.innerHeight : 0;
                  const device_type = w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
                  void supabase
                    .from("not_stylist_events")
                    .insert({ device_type, viewport_width: w, viewport_height: h });
                }}
                className="w-full flex items-center px-3 py-2 rounded-form-sm text-left text-sm text-muted-foreground hover:bg-foreground/[0.025] hover:text-foreground transition-colors duration-200"
              >
                I am not a stylist
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Non-professional link - hidden for now */}
    </div>
  );
};
