import { Label } from "@/components/ui/label";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { useForm } from "../context";
import { countryCodes } from "@/data/country-codes";
import { formatPhoneNumber } from "@/lib/validations/form-utils";

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
  const {
    register,
    control,
    errors,
    getValidationStatus,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    setValue,
  } = useForm();
  const validationStatus = getStepValidationStatus(currentStep);

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
    <div className="space-y-[25px]">
      <div className="space-y-2.5 text-center animate-stagger-1">
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
