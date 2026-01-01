import { Building2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { StateIcon, hasStateIcon } from "@/components/StateIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { cn } from "@/lib/utils";
import { useForm } from "../context";
import { countries, states, provinces } from "@/data/locations";
import { useAddressAutocomplete } from "@/hooks/use-address-autocomplete";
import type { AddressDetails } from "@/services/address";

function BusinessNamePrefixIcon({ error }: { error: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <Building2
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic",
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
        "absolute left-[15px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-form-sm flex items-center justify-center transition-all duration-300 group-focus-within:bg-foreground group-focus-within:shadow-lg group-focus-within:shadow-foreground/10",
        error ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <MapPin
        className={cn(
          "w-[15px] h-[15px] group-focus-within:text-background transition-all duration-300 icon-haptic",
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
  const watchedValues = watch(["accountType", "businessAddress", "countryCode", "provinceCode"]);
  const [accountType, businessAddress, countryCode, provinceCode] = watchedValues;

  const isStudent = accountType === "student";
  const validationStatus = getStepValidationStatus(currentStep);

  // Get country metadata
  const selectedCountry = countries.find((c) => c.code === countryCode);

  // Address autocomplete functionality
  const { isLoading, inputRef, handleInputChange, handleInputFocus, AddressDropdown } =
    useAddressAutocomplete({
      countryCode: selectedCountry?.code,
      onAddressSelect: (details: AddressDetails) => {
        // Auto-fill form fields with address details
        if (details.streetAddress) setValue("businessAddress", details.streetAddress);
        if (details.city) setValue("city", details.city);
        if (details.postalCode) setValue("zipCode", details.postalCode);

        // Set country
        if (details.country) {
          const matchedCountry = countries.find((c) => [c.name, c.code].includes(details.country));

          if (matchedCountry) {
            setValue("countryCode", matchedCountry.code);

            // Set state/province for the matched country
            if (details.state || details.stateShort) {
              const subdivisionList = matchedCountry.code === "US" ? states : provinces;
              const matchedSubdivision = subdivisionList.find(
                (s) => [s.name, s.code].includes(details.state) || s.code === details.stateShort
              );

              if (matchedSubdivision) {
                setValue("provinceCode", matchedSubdivision.code);
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
  const subdivisions = selectedCountry?.code === "US" ? states : provinces;
  const subdivisionOptions = subdivisions.map((s) => ({
    value: s.code,
    label: s.name,
  }));

  // Handle address input change
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("businessAddress", value);
    handleInputChange(value);
  };

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
            isValid={getValidationStatus("zipCode") === "complete"}
          />
        </div>
      </div>
    </div>
  );
};
