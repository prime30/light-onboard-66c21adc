import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { TextInput } from "@/components/TextInput";
import { useForm } from "../context";

// Country codes for phone numbers - using iso as unique key
export const countryCodes = [
  { code: "+1", country: "US", iso: "us" },
  { code: "+1", country: "CA", iso: "ca" },
  { code: "+44", country: "UK", iso: "gb" },
  { code: "+61", country: "AU", iso: "au" },
  { code: "+33", country: "FR", iso: "fr" },
  { code: "+49", country: "DE", iso: "de" },
  { code: "+39", country: "IT", iso: "it" },
  { code: "+34", country: "ES", iso: "es" },
  { code: "+81", country: "JP", iso: "jp" },
  { code: "+86", country: "CN", iso: "cn" },
  { code: "+91", country: "IN", iso: "in" },
  { code: "+52", country: "MX", iso: "mx" },
  { code: "+55", country: "BR", iso: "br" },
] as const;

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
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <Mail
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

function PhonePrefixIcon({ error }: { error: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <Phone
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

export const ContactBasicsStep = () => {
  const { register, errors, getValidationStatus, currentStep, getStepValidationStatus } = useForm();
  const stepNumber = 3;
  const validationStatus = getStepValidationStatus(currentStep);

  return (
    <div className="space-y-[25px]">
      <div className="space-y-2.5 text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {stepNumber}
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
          />
          <TextInput
            name={"lastName"}
            type="text"
            register={register}
            error={errors.lastName}
            placeholder="Legal last name"
            label="Legal Last Name*"
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
            error={errors.email}
            placeholder="your@email"
            label="Email*"
            isValid={getValidationStatus("email") === "complete"}
            prefixIcon={<EmailPrefixIcon emailError={!!errors.email} />}
          />
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
            {/*<Select
              value={phoneCountryCode}
              onValueChange={onPhoneCountryCodeChange}
              {...register("phoneCountryCode")}
            >
              <SelectTrigger
                aria-label="Select country code"
                className={cn(
                  "w-[110px] h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300",
                  errors.phoneCountryCode && "border-destructive/50 bg-destructive/5"
                )}
              >
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <CountryFlag
                      iso={countryCodes.find((c) => c.code === phoneCountryCode)?.iso || "us"}
                    />
                    <span>{phoneCountryCode}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {countryCodes.map((country) => (
                  <SelectItem key={country.iso} value={country.code}>
                    <span className="flex items-center gap-2">
                      <CountryFlag iso={country.iso} />
                      <span>{country.code}</span>
                      <span className="text-muted-foreground text-xs">({country.country})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>*/}

            <div className="relative flex-1 input-glow input-ripple rounded-form">
              <TextInput
                name={"phoneNumber"}
                type="tel"
                register={register}
                error={errors.phoneNumber}
                placeholder="(555) 123-4567"
                isValid={getValidationStatus("phoneNumber") === "complete"}
                prefixIcon={<PhonePrefixIcon error={!!errors.phoneNumber} />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
