import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowRight, Check, CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";

import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { dirtyFieldOptions, useForm } from "../context";
import { Controller } from "react-hook-form";
import type { UploadFileItem } from "@/contexts";
import { countryCodes } from "@/data/country-codes";
import { countries } from "@/data/locations";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { getCredentialConfig, getQualificationOptions } from "@/data/qualifications";
import { formatPhoneNumber } from "@/lib/validations/form-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAutoApproval, useBusinessLocationStepEnabled } from "@/lib/app-settings";
import { useGeoCountry } from "@/hooks/useGeoCountry";

// Flag component using flagcdn.com for consistent cross-platform rendering
export const CountryFlag = ({ iso, className = "" }: { iso: string; className?: string }) => (
  <img
    src={`https://flagcdn.com/w40/${iso}.png`}
    srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
    alt={iso.toUpperCase()}
    className={cn("w-4 h-4 rounded-full object-cover", className)}
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
    setValue,
    watch,
    setError,
    clearErrors,
    emailConflict,
    setEmailConflict,
  } = useForm();

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

    // Cache hit - skip the network round trip entirely.
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
        // Fail silently - submit will still catch the conflict server-side.
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
      data: { valid?: boolean; inUse?: boolean; maskedEmail?: string } | undefined
    ) => {
      if (data?.valid === false) {
        setError("phoneNumber", {
          type: "manual",
          message: "Please enter a valid phone number.",
        });
      } else if (data?.inUse) {
        const masked = data.maskedEmail;
        setError("phoneNumber", {
          type: "manual",
          message: masked
            ? `This phone already has an account under ${masked}.`
            : "This phone number is already linked to another account.",
        });
        toast.error("This phone number is already in use", {
          id: `phone-in-use:${key}`,
          description: masked
            ? `An account already exists under ${masked}. Please sign in or use a different number.`
            : "Please use a different number or sign in to the existing account.",
          duration: 6000,
        });
      } else if (errors.phoneNumber?.type === "manual") {
        clearErrors("phoneNumber");
      }
    };

    const cacheKey = `dde:check-phone:v2:${key}`;
    const cached = cacheGet(cacheKey) as
      | { valid?: boolean; inUse?: boolean; maskedEmail?: string }
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
        applyResult(data as { valid?: boolean; inUse?: boolean; maskedEmail?: string } | undefined);
      } catch {
        // Fail silently - submit will still catch the conflict server-side.
      }
    }, 600);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber, phoneCountryCode]);

  // Instagram handle live verification. We debounce, hit
  // verify-instagram-handle which fetches the public IG profile URL, and
  // surface the confirmed link (or a "not found" hint) inline. If IG rate
  // limits us the result is "unknown" - we don't block submit in that case
  // (server-side format check still applies).
  const socialMediaHandle = watch("socialMediaHandle");
  type IgStatus =
    | { state: "idle" }
    | { state: "invalid" }
    | { state: "checking"; url: string }
    | { state: "exists"; url: string; normalized: string }
    | { state: "missing"; url: string }
    | { state: "unknown"; url: string };
  const [igStatus, setIgStatus] = useState<IgStatus>({ state: "idle" });
  const lastVerifiedHandleRef = useRef<string | null>(null);

  useEffect(() => {
    const raw = String(socialMediaHandle ?? "").trim().replace(/^@+/, "");
    if (!raw) {
      setIgStatus({ state: "idle" });
      lastVerifiedHandleRef.current = null;
      return;
    }
    if (!/^[A-Za-z0-9._]{1,30}$/.test(raw)) {
      setIgStatus({ state: "invalid" });
      return;
    }
    const normalized = raw.toLowerCase();
    const url = `https://www.instagram.com/${normalized}/`;
    if (lastVerifiedHandleRef.current === normalized) return;
    setIgStatus({ state: "checking", url });

    const cacheKey = `dde:verify-ig:${normalized}`;
    const cached = (() => {
      try {
        const v = sessionStorage.getItem(cacheKey);
        return v ? (JSON.parse(v) as { exists: boolean | null }) : null;
      } catch {
        return null;
      }
    })();
    const applyResult = (exists: boolean | null) => {
      lastVerifiedHandleRef.current = normalized;
      if (exists === true) {
        setIgStatus({ state: "exists", url, normalized });
        if (errors.socialMediaHandle?.type === "manual") clearErrors("socialMediaHandle");
      } else if (exists === false) {
        setIgStatus({ state: "missing", url });
        setError("socialMediaHandle", {
          type: "manual",
          message: "We couldn't find that Instagram profile. Double-check the handle.",
        });
      } else {
        setIgStatus({ state: "unknown", url });
        if (errors.socialMediaHandle?.type === "manual") clearErrors("socialMediaHandle");
      }
    };
    if (cached) {
      applyResult(cached.exists);
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-instagram-handle", {
          body: { handle: normalized },
        });
        if (error) {
          setIgStatus({ state: "unknown", url });
          return;
        }
        const currentRaw = String((watch("socialMediaHandle") ?? "") as string)
          .trim()
          .replace(/^@+/, "")
          .toLowerCase();
        if (currentRaw !== normalized) return;
        const exists =
          (data as { exists?: boolean | null } | null | undefined)?.exists ?? null;
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ exists }));
        } catch {
          // ignore quota
        }
        applyResult(exists);
      } catch {
        setIgStatus({ state: "unknown", url });
      }
    }, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socialMediaHandle]);




  // Credential fields moved onto this step (license / ABN number,
  // qualification, optional document upload).
  const accountType = watch("accountType");
  const isSalon = accountType === "salon";
  const isCredentialFlow = accountType === "professional" || accountType === "salon";

  // Country now drives the flow without collecting a business address.
  // Priority: the phone number's country (explicit user choice) wins,
  // IP geolocation only seeds the initial default.
  const geoCountry = useGeoCountry();
  useEffect(() => {
    const raw = String(phoneCountryCode ?? "").trim().toLowerCase();
    if (!raw) return;
    const match = countryCodes.find((c) => c.iso === raw);
    const iso = (match?.country ?? raw.toUpperCase()).toUpperCase();
    if (!countries.some((c) => c.code === iso)) return;
    setValue("countryCode", iso, dirtyFieldOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneCountryCode]);

  const country = String(
    watch("countryCode") ?? geoCountry ?? "US"
  ).toUpperCase();
  const credentialConfig = getCredentialConfig(country);
  const qualificationOptions = getQualificationOptions(country).map((q) => ({
    value: q.value,
    label: q.label,
  }));
  const licenseProofFiles = watch("licenseProofFiles");
  // Optional license upload is only useful for manual review - hide it when
  // automatic approval is on.
  const { enabled: autoApprovalEnabled, loading: autoApprovalLoading } = useAutoApproval();
  const showLicenseUpload = !autoApprovalLoading && !autoApprovalEnabled;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const licenseErrors = errors as any;

  // Tax exemption (US only) now lives directly under the license number, but
  // only when the separate Business Information step is hidden - otherwise it
  // is collected there.
  const { enabled: businessLocationStepEnabled, loading: businessLocationLoading } =
    useBusinessLocationStepEnabled();
  const businessLocationStepVisible =
    !businessLocationLoading && !autoApprovalLoading && (businessLocationStepEnabled || !autoApprovalEnabled);
  const taxExempt = watch("taxExempt");
  const taxExemptFile = watch("taxExemptFile");
  const taxFileRef = useRef<HTMLDivElement>(null);
  const showTaxExemption = country === "US" && !businessLocationStepVisible;
  const handleTaxToggle = (checked: boolean) => {
    setValue("taxExempt", checked, dirtyFieldOptions);
    if (!checked) {
      setValue("taxExemptFile", [], dirtyFieldOptions);
    } else {
      setTimeout(() => {
        taxFileRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  };

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
      <div className="hidden sm:block space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="animate-stagger-1" />
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Your Contact Information
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground/80 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Your information is secure and never shared with third parties.</span>
        </p>
      </div>

      {/* A real <form> element is what lets iOS Safari / Chrome offer grouped
          "fill contact" autofill across name + email + phone in one tap.
          Submission is handled by the step footer, so Enter is a no-op here. */}
      <form
        autoComplete="on"
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="space-y-5"
      >
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

        {/* Email */}
        <div className="animate-stagger-3">
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
        <div className="space-y-2.5 animate-stagger-4 group">
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
            <div className="w-[70px]">
              <Controller
                name="phoneCountryCode"
                control={control}
                render={({ field }) => {
                  const selected = countryCodes.find((c) => c.iso === field.value);
                  return (
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectPrimitive.Trigger
                        className={cn(
                          "h-input w-full rounded-form bg-muted border border-border/50 focus:border-foreground/20 focus:bg-background transition-all duration-300 flex items-center justify-center gap-1.5 px-2 outline-none",
                          errors.phoneCountryCode && "border-destructive/50 bg-destructive/5"
                        )}
                      >
                        <SelectValue placeholder="Select">
                          {selected && (
                            <span className="flex w-full items-center justify-between">
                              <CountryFlag iso={selected.iso} />
                              <span className="text-sm font-medium">{selected.code}</span>
                            </span>
                          )}
                        </SelectValue>
                      </SelectPrimitive.Trigger>
                      <SelectContent>
                        {countryCodes.map((country) => (
                          <SelectPrimitive.Item
                            key={country.iso}
                            value={country.iso}
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-2 px-3 text-sm outline-none transition-colors",
                              "focus:bg-accent focus:text-accent-foreground",
                              "data-[state=checked]:bg-foreground/[0.04]"
                            )}
                          >
                            <CountryFlag iso={country.iso} />
                            <span className="font-medium">{country.code}</span>
                            <span className="text-muted-foreground text-xs">({country.name})</span>
                          </SelectPrimitive.Item>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
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
                inputMode="tel"
                isValid={getValidationStatus("phoneNumber") === "complete"}
                prefixIcon={<PhonePrefixIcon error={!!errors.phoneNumber} />}
                onBlur={(event) => {
                  setValue("phoneNumber", formatPhoneNumber(event.target.value));
                }}
              />
            </div>
          </div>
          {errors.phoneNumber?.type === "manual" &&
            typeof errors.phoneNumber?.message === "string" &&
            (errors.phoneNumber.message.toLowerCase().includes("already linked") ||
              errors.phoneNumber.message.toLowerCase().includes("already has an account")) && (
              <ConflictPills navigate={navigate} />
            )}
        </div>

        {/* Credential fields (professional + salon, non-AU).
            These used to live on a dedicated license step. */}
        {isCredentialFlow && country !== "AU" && (
          <div className="space-y-5 pt-[5px] animate-stagger-5">
            <TextInput
              name="licenseNumber"
              type="text"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              register={register}
              error={licenseErrors.licenseNumber}
              placeholder={credentialConfig.licenseFieldPlaceholder(isSalon)}
              label={credentialConfig.licenseFieldLabel(isSalon)}
              isValid={getValidationStatus("licenseNumber") === "complete"}
              prefixChip={
                <span className="inline-flex items-center justify-center gap-1.5 w-[100px] px-2.5 py-1 rounded-form bg-muted border border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em] whitespace-nowrap">
                  <Check className="w-3 h-3" />
                  Pro Only
                </span>
              }
            />

            {credentialConfig.hasQualification && qualificationOptions.length > 0 && (
              <SelectInput
                name="qualification"
                control={control}
                error={licenseErrors.qualification}
                options={qualificationOptions}
                label="Hairdressing qualification*"
                placeholder="Select your qualification"
                isValid={getValidationStatus("qualification" as never) === "complete"}
              />
            )}

            {showLicenseUpload && (
              <div data-field-wrapper="licenseProofFiles" className="space-y-2.5">
                <div className="flex items-center justify-between gap-2.5">
                  <Label className="text-sm font-medium">
                    {credentialConfig.uploadCopy(isSalon)}
                  </Label>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted border border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
                    Optional
                  </span>
                </div>
                <MultiFileUpload
                  files={
                    (licenseProofFiles || []) as {
                      id: string;
                      file: File;
                      status: "completed" | "error" | "pending" | "uploading";
                      progress: number;
                      error?: string;
                      url?: string;
                    }[]
                  }
                  onFilesChange={(files) => setValue("licenseProofFiles", files)}
                  placeholder="Upload photos of your license"
                  maxFiles={3}
                />
              </div>
            )}

            {/* Tax exemption (US only) — secondary to license input */}
            {showTaxExemption && (
              <div className="space-y-3 pt-2">
                <label
                  className={cn(
                    "relative flex items-start gap-3 group cursor-pointer",
                    taxExempt === true && "text-foreground"
                  )}
                >
                  <Checkbox
                    checked={taxExempt === true}
                    onCheckedChange={(checked) => handleTaxToggle(!!checked)}
                    className="rounded-full mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                  />
                  <span className="inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    Do you want to upload a tax exemption?
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted border border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.12em] shrink-0">
                      Not required
                    </span>
                  </span>
                </label>

                <div
                  ref={taxFileRef}
                  className={cn(
                    "grid transition-all duration-400",
                    taxExempt === true ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                  style={{
                    transitionTimingFunction:
                      taxExempt === true ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease-out",
                  }}
                >
                  <div className="overflow-hidden">
                    <div
                      className={cn(taxExempt === true && "animate-haptic-pop")}
                      data-field="tax-document"
                    >
                      <MultiFileUpload
                        files={
                          Array.isArray(taxExemptFile) &&
                          taxExemptFile.every((item) => typeof item === "object")
                            ? (taxExemptFile as UploadFileItem[])
                            : []
                        }
                        onFilesChange={(files: UploadFileItem[]) =>
                          setValue("taxExemptFile", files, dirtyFieldOptions)
                        }
                        placeholder="Upload your state tax-exempt license"
                        error={!!licenseErrors.taxExemptFile}
                        errorMessage="Please upload your tax exemption document"
                        maxFiles={1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instagram handle - required for every registration */}
        <div className="space-y-2 animate-stagger-6 group">
          <TextInput
            name="socialMediaHandle"
            type="text"
            register={register}
            error={errors.socialMediaHandle}
            placeholder="yourhairhandle"
            autoComplete="off"
            label={
              <>
                Instagram handle<span className="text-destructive">*</span>
              </>
            }
            prefixIcon={
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base font-medium">
                @
              </span>
            }
            className="[&_input]:pl-9"
          />
          {/* Live verification status */}
          {igStatus.state === "checking" && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Verifying instagram.com/{socialMediaHandle?.toString().trim().replace(/^@+/, "")}...
            </p>
          )}
          {igStatus.state === "exists" && (
            <a
              href={igStatus.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 mt-1.5 group/link"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Profile found:</span>
              <span className="underline underline-offset-2">
                instagram.com/{igStatus.normalized}
              </span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </a>
          )}
          {igStatus.state === "missing" && (
            <p className="text-xs text-destructive flex items-center gap-1.5 mt-1.5">
              <XCircle className="w-3 h-3" />
              We couldn't find that profile on Instagram. Check the spelling.
            </p>
          )}
          {igStatus.state === "unknown" && (
            <a
              href={igStatus.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-1.5 group/link"
            >
              <span>Saved as</span>
              <span className="underline underline-offset-2">
                instagram.com/{socialMediaHandle?.toString().trim().replace(/^@+/, "")}
              </span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </a>
          )}

          {igStatus.state === "idle" && (
            <p className="text-xs text-muted-foreground mt-1.5">
              It helps us verify that you're a stylist faster. Enter your handle only, we'll
              confirm the profile link automatically.
            </p>
          )}
        </div>

      </form>
    </div>
  );
};
