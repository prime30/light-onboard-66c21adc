import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { useForm } from "../context";
import { countryCodes } from "@/data/country-codes";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { supabase } from "@/integrations/supabase/client";

// Flag component using flagcdn.com for consistent cross-platform rendering
export const CountryFlag = ({ iso, className = "" }: { iso: string; className?: string }) => (
  <img
    src={`https://flagcdn.com/w40/${iso}.png`}
    srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
    alt={iso.toUpperCase()}
    className={cn("w-5 h-auto rounded-sm object-cover", className)}
    loading="lazy"
  />
);

function EmailPrefixIcon({ emailError: error }: { emailError: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <Mail
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-foreground transition-all duration-300 icon-haptic",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

function ConflictPills({ navigate }: { navigate: (to: string) => void }) {
  return (
    <div className="mt-2.5 flex items-center gap-[5px] animate-fade-in">
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="group/signin inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-muted/60 hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        <span>Sign in</span>
        <ArrowRight className="w-3 h-3 transition-transform group-hover/signin:translate-x-0.5" />
      </button>
      <button
        type="button"
        onClick={() => navigate("/reset-password")}
        className="group/reset inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-muted/60 hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        <span>Forgot password?</span>
        <ArrowRight className="w-3 h-3 transition-transform group-hover/reset:translate-x-0.5" />
      </button>
    </div>
  );
}

function PhonePrefixIcon({ error }: { error: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <Phone
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-foreground transition-all duration-300 icon-haptic",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

export const ContactBasicsStep = () => {
  const navigate = useNavigate();
  const {
    register,
    control,
    errors,
    getValidationStatus,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    setValue,
    watch,
    setError,
    clearErrors,
    emailConflict,
    setEmailConflict,
  } = useForm();
  const validationStatus = getStepValidationStatus(currentStep);

  // sessionStorage-cached lookups to avoid re-calling Shopify for the same
  // value twice in a session (covers back-nav, refresh-into-restore, and
  // users editing nearby fields without changing email/phone).
  const cacheGet = (key: string): unknown | undefined => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  };
  const cacheSet = (key: string, value: unknown) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / private-mode failures
    }
  };

  // Debounced check: does an account already exist with this email?
  const email = watch("email");
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  const matchingEmailConflict = emailConflict?.email === normalizedEmail ? emailConflict : null;
  const emailDisplayError = errors.email || (
    matchingEmailConflict
      ? { type: "manual", message: matchingEmailConflict.message }
      : undefined
  );
  const lastCheckedRef = useRef<string | null>(null);
  const lastTrackedLeadRef = useRef<string | null>(null);
  useEffect(() => {
    const value = (email ?? "").trim().toLowerCase();
    if (emailConflict && emailConflict.email !== value) {
      setEmailConflict(null);
      if (errors.email?.type === "manual") clearErrors("email");
    }
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;


    if (lastCheckedRef.current === value) return;

    const applyResult = (data: { exists?: boolean } | undefined) => {
      if (data?.exists) {
        const message = "An account with this email already exists. Please sign in instead.";
        setEmailConflict({ email: value, message });
        setError("email", {
          type: "manual",
          message,
        });
        toast.error("This email is already registered", {
          id: `email-exists:${value}`,
          description: "Please sign in instead of creating a new account.",
          duration: 6000,
        });
      } else if (errors.email?.type === "manual") {
        setEmailConflict(null);
        clearErrors("email");
      }
    };

    // Cache hit — skip the network round trip entirely.
    const cacheKey = `dde:check-email:${value}`;
    const cached = cacheGet(cacheKey) as { exists?: boolean } | undefined;
    if (cached) {
      lastCheckedRef.current = value;
      applyResult(cached);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-email", {
          body: { email: value },
        });
        if (error) return;
        lastCheckedRef.current = value;
        const current = (watch("email") ?? "").trim().toLowerCase();
        if (current !== value) return;
        cacheSet(cacheKey, data ?? {});
        applyResult(data as { exists?: boolean } | undefined);
      } catch {
        // Fail silently — submit will still catch the conflict server-side.
      }
    }, 600);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Debounced check: phone validity + uniqueness. Gated on plausible
  // length per country (NANP = 10 digits, others 7–15) so we never fire a
  // Shopify search for clearly-incomplete input. Server-side backstop in
  // create-customer returns 400 PHONE_INVALID / 409 PHONE_IN_USE.
  const phoneNumber = watch("phoneNumber");
  const phoneCountryCode = watch("phoneCountryCode");
  const lastCheckedPhoneRef = useRef<string | null>(null);
  useEffect(() => {
    const raw = (phoneNumber ?? "").replace(/\D/g, "");
    const code = phoneCountryCode ?? "";
    // NANP (+1) must be exactly 10 digits; everything else 7–15 (E.164 max).
    const isNanp = code === "+1" || code === "1";
    const lengthOk = isNanp ? raw.length === 10 : raw.length >= 7 && raw.length <= 15;
    if (!raw || !lengthOk) return;

    const key = `${code}|${raw}`;
    if (lastCheckedPhoneRef.current === key) return;

    const applyResult = (
      data: { valid?: boolean; inUse?: boolean } | undefined
    ) => {
      if (data?.valid === false) {
        setError("phoneNumber", {
          type: "manual",
          message: "Please enter a valid phone number.",
        });
      } else if (data?.inUse) {
        setError("phoneNumber", {
          type: "manual",
          message:
            "This phone number is already linked to another account.",
        });
        toast.error("This phone number is already in use", {
          id: `phone-in-use:${key}`,
          description:
            "Please use a different number or sign in to the existing account.",
          duration: 6000,
        });
      } else if (errors.phoneNumber?.type === "manual") {
        clearErrors("phoneNumber");
      }
    };

    const cacheKey = `dde:check-phone:${key}`;
    const cached = cacheGet(cacheKey) as
      | { valid?: boolean; inUse?: boolean }
      | undefined;
    if (cached) {
      lastCheckedPhoneRef.current = key;
      applyResult(cached);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-phone", {
          body: { phoneNumber, phoneCountryCode },
        });
        if (error) return;
        lastCheckedPhoneRef.current = key;
        const currentRaw = (watch("phoneNumber") ?? "").replace(/\D/g, "");
        const currentCode = watch("phoneCountryCode") ?? "";
        if (`${currentCode}|${currentRaw}` !== key) return;
        cacheSet(cacheKey, data ?? {});
        applyResult(data as { valid?: boolean; inUse?: boolean } | undefined);
      } catch {
        // Fail silently — submit will still catch the conflict server-side.
      }
    }, 600);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber, phoneCountryCode]);




  const countryCodeOptions = countryCodes.map((country) => ({
    value: country.iso,
    label: (
      <span className="flex items-center gap-2">
        <CountryFlag iso={country.iso} />
        <span>{country.code}</span>
        <span className="text-muted-foreground text-xs">({country.name})</span>
      </span>
    ),
    triggerContent: (
      <span className="flex items-center gap-2">
        <CountryFlag iso={country.iso} />
        <span>{country.code}</span>
      </span>
    ),
  }));

  return (
    <div className="space-y-[clamp(12px,2vh,25px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(currentStep)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Your Contact Information
        </h1>
        <p className="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-2.5 h-2.5" />
          <span>Your information is secure and never shared with third parties.</span>
        </p>
      </div>

      <div className="space-y-5">
        {/* First and Last Name */}
        <div className="grid grid-cols-2 gap-2.5 animate-stagger-2">
          <TextInput
            name={"firstName"}
            type="text"
            register={register}
            error={errors.firstName}
            placeholder="Legal first name"
            label="Legal First Name*"
            autoComplete="given-name"
          />
          <TextInput
            name={"lastName"}
            type="text"
            register={register}
            error={errors.lastName}
            placeholder="Legal last name"
            label="Legal Last Name*"
            autoComplete="family-name"
          />
        </div>

        {/* Preferred Name */}
        <div className="animate-stagger-3">
          <TextInput
            name={"preferredName"}
            type="text"
            register={register}
            error={errors.preferredName}
            placeholder="Preferred name"
            autoComplete="nickname"
            label={
              <>
                Preferred name{" "}
                <span className="text-muted-foreground font-normal">
                  (if different from legal name)
                </span>
              </>
            }
          />
        </div>

        {/* Email */}
        <div className="animate-stagger-4">
          <TextInput
            name={"email"}
            type="email"
            register={register}
            error={emailDisplayError}
            placeholder="your@email"
            label="Email*"
            autoComplete="email"
            isValid={getValidationStatus("email") === "complete" && !matchingEmailConflict}
            prefixIcon={<EmailPrefixIcon emailError={!!emailDisplayError} />}
            onBlur={(event) => {
              const value = (event.target.value ?? "").trim().toLowerCase();
              if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
              if (lastTrackedLeadRef.current === value) return;
              lastTrackedLeadRef.current = value;
              supabase.functions
                .invoke("track-registration-lead", {
                  body: {
                    email: value,
                    phase: "started",
                    accountType: watch("accountType") ?? null,
                    lastStep: "contact-basics",
                    firstName: watch("firstName") ?? null,
                    lastName: watch("lastName") ?? null,
                  },
                })
                .catch(() => {
                  // Non-blocking
                });
            }}
          />
          {matchingEmailConflict && (
            <ConflictPills navigate={navigate} />
          )}
        </div>


        {/* Phone Number with Country Code */}
        <div className="space-y-2.5 animate-stagger-5 group">
          <Label
            htmlFor="phoneNumber"
            className={cn(
              "text-sm font-medium label-float",
              (errors.phoneNumber || errors.phoneCountryCode) && "text-destructive"
            )}
          >
            Phone number*
          </Label>
          <div className="flex gap-2">
            <div className="w-[110px]">
              <SelectInput
                name="phoneCountryCode"
                control={control}
                error={errors.phoneCountryCode}
                options={countryCodeOptions}
                placeholder="Select"
                className="w-full"
              />
            </div>

            <div className="relative flex-1 input-glow input-ripple rounded-form">
              <TextInput
                name={"phoneNumber"}
                type="tel"
                register={register}
                error={errors.phoneNumber}
                placeholder="(555) 123-4567"
                autoComplete="tel-national"
                isValid={getValidationStatus("phoneNumber") === "complete"}
                prefixIcon={<PhonePrefixIcon error={!!errors.phoneNumber} />}
                onBlur={(event) => {
                  setValue("phoneNumber", formatPhoneNumber(event.target.value));
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
