import { Input } from "@/components/ui/input";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";

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

// Phone number validation - validates the local number part (without country code)
export const isValidPhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Must have exactly 10 digits for US/CA format
  return cleaned.length === 10;
};

export interface ContactBasicsStepProps {
  accountType: string | null;
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phoneNumber: string;
  phoneCountryCode: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPreferredNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onPhoneCountryCodeChange: (value: string) => void;
  showValidationErrors?: boolean;
  validationStatus: "complete" | "in-progress" | "error";
}

export const ContactBasicsStep = ({
  accountType,
  firstName,
  lastName,
  preferredName,
  email,
  phoneNumber,
  phoneCountryCode,
  onFirstNameChange,
  onLastNameChange,
  onPreferredNameChange,
  onEmailChange,
  onPhoneNumberChange,
  onPhoneCountryCodeChange,
  showValidationErrors = false,
  validationStatus
}: ContactBasicsStepProps) => {
  const firstNameError = showValidationErrors && firstName.trim() === "";
  const lastNameError = showValidationErrors && lastName.trim() === "";
  const emailError = showValidationErrors && email.trim() === "";
  const phoneEmpty = phoneNumber.trim() === "";
  const phoneInvalid = !phoneEmpty && !isValidPhoneNumber(phoneNumber);
  const phoneError = showValidationErrors && (phoneEmpty || phoneInvalid);
  const stepNumber = 3;
  
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
          <div className="space-y-2.5 group">
            <Label htmlFor="legalFirstName" className={cn("text-sm font-medium label-float", firstNameError && "text-destructive")}>
              Legal first name*
            </Label>
            <div className="input-glow input-ripple rounded-form">
              <Input 
                id="legalFirstName" 
                type="text" 
                placeholder="Legal first name" 
                value={firstName} 
                onChange={e => onFirstNameChange(e.target.value)} 
                className={cn(
                  "h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus", 
                  firstNameError && "border-destructive/50 bg-destructive/5"
                )}
              />
            </div>
            {firstNameError && <p className="text-xs text-destructive">First name is required</p>}
          </div>
          <div className="space-y-2.5 group">
            <Label htmlFor="legalLastName" className={cn("text-sm font-medium label-float", lastNameError && "text-destructive")}>
              Legal last name*
            </Label>
            <div className="input-glow input-ripple rounded-form">
              <Input 
                id="legalLastName" 
                type="text" 
                placeholder="Legal last name" 
                value={lastName} 
                onChange={e => onLastNameChange(e.target.value)} 
                className={cn(
                  "h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus", 
                  lastNameError && "border-destructive/50 bg-destructive/5"
                )}
              />
            </div>
            {lastNameError && <p className="text-xs text-destructive">Last name is required</p>}
          </div>
        </div>

        {/* Preferred Name */}
        <div className="space-y-2.5 animate-stagger-3 group">
          <Label htmlFor="preferredName" className="text-sm font-medium label-float">
            Preferred name <span className="text-muted-foreground font-normal">(if different from legal name)</span>
          </Label>
          <div className="input-glow input-ripple rounded-form">
            <Input 
              id="preferredName" 
              type="text" 
              placeholder="Preferred name" 
              value={preferredName} 
              onChange={e => onPreferredNameChange(e.target.value)} 
              className="h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus" 
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2.5 animate-stagger-4 group">
          <Label htmlFor="email" className={cn("text-sm font-medium label-float", emailError && "text-destructive")}>
            Email*
          </Label>
          <div className="relative input-glow input-ripple rounded-form">
            <div className={cn(
              "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10", 
              emailError ? "bg-destructive/10" : "bg-muted"
            )}>
              <Mail className={cn(
                "w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic", 
                emailError ? "text-destructive" : "text-muted-foreground"
              )} />
            </div>
            <ValidatedInput 
              id="email" 
              type="email" 
              placeholder="your@email.com" 
              value={email} 
              onChange={e => onEmailChange(e.target.value)} 
              validationRule="email"
              className={cn(
                "h-input pl-[55px] rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus", 
                emailError && "border-destructive/50 bg-destructive/5"
              )}
            />
          </div>
          {emailError && <p className="text-xs text-destructive">Email is required</p>}
        </div>

        {/* Phone Number with Country Code */}
        <div className="space-y-2.5 animate-stagger-5 group">
          <Label htmlFor="phoneNumber" className={cn("text-sm font-medium label-float", phoneError && "text-destructive")}>
            Phone number*
          </Label>
          <div className="flex gap-2">
            <Select value={phoneCountryCode} onValueChange={onPhoneCountryCodeChange}>
              <SelectTrigger 
                aria-label="Select country code" 
                className={cn(
                  "w-[110px] h-input rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300", 
                  phoneError && "border-destructive/50 bg-destructive/5"
                )}
              >
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <CountryFlag iso={countryCodes.find(c => c.code === phoneCountryCode)?.iso || "us"} />
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
            </Select>
            
            <div className="relative flex-1 input-glow input-ripple rounded-form">
              <div className={cn(
                "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10", 
                phoneError ? "bg-destructive/10" : "bg-muted"
              )}>
                <Phone className={cn(
                  "w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic", 
                  phoneError ? "text-destructive" : "text-muted-foreground"
                )} />
              </div>
              <ValidatedInput 
                id="phoneNumber" 
                type="tel" 
                placeholder="(555) 123-4567" 
                value={phoneNumber} 
                onChange={e => onPhoneNumberChange(e.target.value)} 
                validationRule="phone"
              className={cn(
                  "h-input pl-[55px] rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus", 
                  phoneError && "border-destructive/50 bg-destructive/5"
                )}
              />
            </div>
          </div>
          {showValidationErrors && phoneEmpty && <p className="text-xs text-destructive">Phone number is required</p>}
          {phoneInvalid && <p className="text-xs text-destructive">Please enter a valid 10-digit phone number</p>}
        </div>
      </div>
    </div>
  );
};
