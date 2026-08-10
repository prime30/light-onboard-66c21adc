import { useRef } from "react";
import { Building2, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiFileUpload } from "../MultiFileUpload";
import { UploadFileItem } from "@/contexts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { cn } from "@/lib/utils";
import { dirtyFieldOptions, useForm } from "../context";
import { countries, states, provinces } from "@/data/locations";
import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";
import type { AddressDetails } from "@/services/address";

function BusinessNamePrefixIcon({ error }: { error: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <Building2
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-foreground transition-all duration-300 icon-haptic",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

function AddressPrefixIcon({ error }: { error: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <MapPin
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-foreground transition-all duration-300 icon-haptic",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

export const BusinessLocationStep = () => {
  const {
    register,
    control,
    watch,
    setValue,
    errors: rawErrors,
    getValidationStatus,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
  } = useForm();

  // Cast errors to any to handle discriminated union field access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = rawErrors as any;

  // Watch form values
  const watchedValues = watch([
    "accountType",
    "businessAddress",
    "countryCode",
    "provinceCode",
    "zipCode",
    "taxExempt",
    "taxExemptFile",
  ]);
  const [accountType, businessAddress, countryCode, provinceCode, zipCode, taxExempt, taxExemptFile] =
    watchedValues;

  const taxFileRef = useRef<HTMLDivElement>(null);

  // Tax exemption is a US-only concept (state sales tax).
  const showTaxExemption = (countryCode ?? "US") === "US";

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

  const isStudent = accountType === "student";
  

  // Get country metadata
  const selectedCountry = countries.find((c) => c.code === countryCode);

  // Country-aware ZIP/postal validity for the inline green checkmark.
  // Mirrors ZIP_PATTERNS in auth-schemas.ts so the UI signal matches the
  // schema's superRefine gating (US: 5 or 5-4, CA: A1A 1A1, else generic).
  const isZipValid = (() => {
    const trimmed = (zipCode ?? "").trim();
    if (!trimmed) return false;
    const cc = countryCode?.toUpperCase();
    if (cc === "US") return /^\d{5}(-\d{4})?$/.test(trimmed);
    if (cc === "CA")
      return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ \-]?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(trimmed);
    if (cc === "AU") return /^\d{4}$/.test(trimmed);
    return /^[A-Za-z0-9][A-Za-z0-9 \-]{1,9}$/.test(trimmed);
  })();


  // Address autocomplete functionality
  const { isLoading, inputRef, handleInputChange, handleInputFocus, AddressDropdown } =
    useAddressAutocomplete({
      countryCode: selectedCountry?.code,
      regionCode: provinceCode,
      onAddressSelect: (details: AddressDetails) => {
        // Autofill must run RHF validation so any stale "expected string,
        // received undefined" errors on these fields clear immediately.
        // Programmatic setValue defaults to shouldValidate:false, which
        // leaves prior errors on-screen even though the fields now hold
        // valid values.
        const opts = { shouldValidate: true, shouldDirty: true, shouldTouch: true } as const;
        if (details.streetAddress) setValue("businessAddress", details.streetAddress, opts);
        if (details.city) setValue("city", details.city, opts);
        if (details.postalCode) setValue("zipCode", details.postalCode, opts);

        // Set country
        if (details.country) {
          const matchedCountry = countries.find((c) => [c.name, c.code].includes(details.country));

          if (matchedCountry) {
            setValue("countryCode", matchedCountry.code, opts);

            // Set state/province for the matched country
            if (details.state || details.stateShort) {
              const subdivisionList = matchedCountry.subdivisions;
              const matchedSubdivision = subdivisionList.find(
                (s) => [s.name, s.code].includes(details.state) || s.code === details.stateShort
              );

              if (matchedSubdivision) {
                setValue("provinceCode", matchedSubdivision.code, opts);
              }
            }
          }
        }
      },
    });

  // Create options for selects
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  // Get subdivisions based on selected country
  const subdivisions = selectedCountry?.subdivisions ?? states;
  const subdivisionOptions = subdivisions.map((s) => ({
    value: s.code,
    label: s.name,
  }));

  // Handle address input change
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("businessAddress", value, { shouldValidate: true, shouldDirty: true });
    handleInputChange(value);
  };

  return (
    <div className="space-y-[clamp(12px,2vh,25px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="animate-stagger-1" />
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          {isStudent ? "Where are you located?" : "Where is your business located?"}
        </h1>
      </div>

      <div className="space-y-5">
        {/* Business Name */}
        <div className="animate-stagger-2">
          <TextInput
            name="businessName"
            type="text"
            register={register}
            error={errors.businessName}
            placeholder="Business or salon name"
            label="Business or salon name*"
            isValid={getValidationStatus("businessName") === "complete"}
            prefixIcon={<BusinessNamePrefixIcon error={!!errors.businessName} />}
            autoComplete="organization"
          />
        </div>

        {/* Address - Custom implementation with autocomplete */}
        <div className="space-y-2.5 animate-stagger-3">
          <Label
            htmlFor="businessAddress"
            className={cn(
              "text-sm font-medium label-float",
              errors.businessAddress && "text-destructive"
            )}
          >
            Address*
          </Label>
          <div className="relative">
            <div
              className={cn(
                "relative group input-glow input-ripple rounded-form",
                errors.businessAddress && "ring-2 ring-destructive/20"
              )}
            >
              <AddressPrefixIcon error={!!errors.businessAddress} />
              <Input
                ref={inputRef}
                id="businessAddress"
                type="text"
                placeholder="Start typing your address..."
                value={businessAddress || ""}
                onChange={handleAddressInputChange}
                onFocus={handleInputFocus}
                autoComplete="off"
                className={cn(
                  "h-input pl-[55px] rounded-form bg-muted border-border/50 focus:border-foreground/30 focus:bg-background transition-all duration-300 focus:shadow-input-focus",
                  errors.businessAddress && "border-destructive/50 bg-destructive/5"
                )}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Address Predictions Dropdown */}
            <AddressDropdown />
          </div>
          {errors.businessAddress && (
            <p className="text-xs text-destructive mt-1">{errors.businessAddress.message}</p>
          )}
        </div>

        {/* Suite */}
        <div className="animate-stagger-4">
          <TextInput
            name="suiteNumber"
            type="text"
            register={register}
            error={errors.suiteNumber}
            placeholder="Suite, Unit, Apt #"
            label="Suite/Unit # (optional)"
            autoComplete="address-line2"
          />
        </div>

        {/* Country */}
        <div className="animate-stagger-5">
          <SelectInput
            name="countryCode"
            control={control}
            error={errors.countryCode}
            options={countryOptions}
            label="Country*"
            placeholder="Select country"
            isValid={getValidationStatus("countryCode") === "complete"}
          />
        </div>

        {/* City + State */}
        <div className="grid grid-cols-2 gap-2.5 animate-stagger-6">
          <TextInput
            name="city"
            type="text"
            register={register}
            error={errors.city}
            placeholder="City"
            label="City*"
            isValid={getValidationStatus("city") === "complete"}
            autoComplete="address-level2"
          />

          {/* State/Province - Custom implementation for state icon */}
          <div className="space-y-2.5 group">
            <Label
              htmlFor="stateProvince"
              className={cn(
                "text-sm font-medium label-float",
                errors.provinceCode && "text-destructive"
              )}
            >
              {selectedCountry?.subdivisionLabel || "State/Province"}*
            </Label>
            <div className="input-glow input-ripple rounded-form relative">
              {provinceCode && selectedCountry?.code === "US" && hasStateIcon(provinceCode) && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[24px] h-[24px] flex items-center justify-center z-10">
                  <StateIcon state={provinceCode} size={22} className="text-foreground" />
                </div>
              )}
              <SelectInput
                name="provinceCode"
                control={control}
                error={errors.provinceCode}
                options={subdivisionOptions}
                placeholder={`Select ${selectedCountry?.subdivisionType || "state/province"}`}
                isValid={getValidationStatus("provinceCode") === "complete"}
                className={cn(
                  provinceCode &&
                    selectedCountry?.code === "US" &&
                    hasStateIcon(provinceCode) &&
                    "[&_button]:pl-[42px]"
                )}
              />
            </div>
          </div>
        </div>

        {/* Zip Code */}
        <div className="animate-stagger-7">
          <TextInput
            name="zipCode"
            type="text"
            register={register}
            error={errors.zipCode}
            placeholder={selectedCountry?.postalCodeLabel || "Zip/Postal code"}
            label={`${selectedCountry?.postalCodeLabel || "Zip/Postal code"}*`}
            isValid={isZipValid}
            autoComplete="postal-code"
          />
        </div>

        {/* Tax exemption (US only) */}
        {showTaxExemption && (
          <div className="space-y-[15px] pt-[5px] animate-stagger-7">
            <label
              className={cn(
                "relative flex items-start gap-[15px] group p-4 -mx-1 rounded-form bg-background border transition-colors cursor-pointer",
                taxExempt === true
                  ? "border-foreground/40 hover:border-foreground/60"
                  : "border-border hover:border-foreground/30"
              )}
            >
              <Checkbox
                checked={taxExempt === true}
                onCheckedChange={(checked) => handleTaxToggle(!!checked)}
                className="rounded-full mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
              />
              <div className="space-y-0.5 flex-1">
                <span className="text-sm font-medium text-foreground">
                  I have a tax exemption certificate
                </span>
                <p className="text-xs text-muted-foreground">
                  Upload it to avoid sales tax on your orders. Not required to register.
                </p>
              </div>
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
                    error={!!errors.taxExemptFile}
                    errorMessage="Please upload your tax exemption document"
                    maxFiles={1}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
