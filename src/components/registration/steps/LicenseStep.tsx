import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { cn } from "@/lib/utils";
import { useForm } from "../context";
import { QUALIFICATION_OPTIONS } from "@/data/qualifications";

const salonSizes = ["1-3 stylists", "4-10 stylists", "11-25 stylists", "26+ stylists"];
const salonStructures = ["Booth Rental", "Commission-based", "Hybrid", "Owner-operated"];

export const LicenseStep = () => {
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

  // Watch form values used in this step.
  const watchedValues = watch([
    "accountType",
    "licenseNumber",
    "licenseProofFiles",
    "countryCode",
    "provinceCode",
    "qualification",
  ]);
  const [accountType, licenseNumber, licenseProofFiles, countryCode, provinceCode] = watchedValues;

  const isSalon = accountType === "salon";
  const isAU = (countryCode ?? "").toUpperCase() === "AU";
  const isNSW = isAU && (provinceCode ?? "").toUpperCase() === "NSW";

  const label = isAU
    ? isSalon
      ? "Upload your salon Certificate III or business registration*"
      : "Upload your Certificate III (or state licence)"
    : isSalon
      ? "Upload your salon license*"
      : "For quicker account verification process upload your license";
  const validationStatus = getStepValidationStatus(currentStep);

  // Create options for selects
  const salonSizeOptions = salonSizes.map((size) => ({
    value: size,
    label: size,
  }));

  const salonStructureOptions = salonStructures.map((structure) => ({
    value: structure,
    label: structure,
  }));

  const qualificationOptions = QUALIFICATION_OPTIONS.map((q) => ({
    value: q.value,
    label: q.label,
  }));

  return (
    <div className="space-y-[clamp(12px,2vh,20px)] sm:space-y-[clamp(15px,2.5vh,30px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status={validationStatus} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(currentStep)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          {isAU ? "Provide your credentials" : "Provide your license number"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          {isAU
            ? "Enter your ABN and hairdressing qualification"
            : isSalon
              ? "Let us make sure you are a salon manager"
              : "Enter your cosmetology license details"}
        </p>
      </div>

      <div className="flex gap-[15px] pl-5 border-l-2 border-border animate-stagger-2">
        <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground/70 leading-relaxed">
          {isAU
            ? "Wholesale pricing is exclusive to verified Australian salon professionals."
            : isSalon
              ? "Wholesale pricing shown is exclusive to verified professionals."
              : "Please enter your license exactly as it appears from the state."}
        </p>
      </div>

      <div className="space-y-5">
        {/* License Number / ABN */}
        <div className="animate-stagger-3 space-y-2">
          <TextInput
            name="licenseNumber"
            type="text"
            register={register}
            error={errors.licenseNumber}
            placeholder={
              isAU
                ? "e.g. 12 345 678 901"
                : isSalon
                  ? "Salon License #"
                  : "Enter your license number"
            }
            label={isAU ? "ABN*" : isSalon ? "Salon License #*" : "License number*"}
            isValid={getValidationStatus("licenseNumber") === "complete"}
          />
        </div>

        {/* AU: Qualification */}
        {isAU && (
          <div className="animate-stagger-4">
            <SelectInput
              name="qualification"
              control={control}
              error={errors.qualification}
              options={qualificationOptions}
              label="Hairdressing qualification*"
              placeholder="Select your qualification"
              isValid={getValidationStatus("qualification" as never) === "complete"}
            />
          </div>
        )}

        {/* AU + NSW: NSW hairdresser licence */}
        {isNSW && (
          <div className="animate-stagger-4 space-y-2">
            <TextInput
              name="nswLicenseNumber"
              type="text"
              register={register}
              error={errors.nswLicenseNumber}
              placeholder="Enter your NSW hairdresser licence number"
              label="NSW hairdresser licence number*"
              isValid={getValidationStatus("nswLicenseNumber" as never) === "complete"}
            />
          </div>
        )}

        {/* Salon-specific fields */}
        {isSalon && (
          <>
            {/* Salon Size */}
            <div className="animate-stagger-4">
              <SelectInput
                name="salonSize"
                control={control}
                error={errors.salonSize}
                options={salonSizeOptions}
                label="What's the size of your salon?*"
                placeholder="Select salon size"
                isValid={getValidationStatus("salonSize") === "complete"}
              />
            </div>

            {/* Salon Structure */}
            <div className="animate-stagger-5">
              <SelectInput
                name="salonStructure"
                control={control}
                error={errors.salonStructure}
                options={salonStructureOptions}
                label="Select your salon structure*"
                placeholder="Select salon structure"
                isValid={getValidationStatus("salonStructure") === "complete"}
              />
            </div>
          </>
        )}

        {/* License proof upload.
            - Required for salon: always visible.
            - Optional for professionals: reveals after 3+ chars in license # for nicer pacing. */}
        <div
          data-field-wrapper="licenseProofFiles"
          className={cn(
            "grid transition-all duration-400 animate-stagger-4",
            isSalon || (licenseNumber?.trim()?.length || 0) >= 3
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
          style={{
            transitionTimingFunction:
              isSalon || (licenseNumber?.trim()?.length || 0) >= 3
                ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "ease-out",
          }}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-2.5",
                (isSalon || (licenseNumber?.trim()?.length || 0) >= 3) && "animate-haptic-pop"
              )}
            >
              {!isSalon && (
                <div className="flex justify-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted border border-border/50 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
                    Optional
                  </span>
                </div>
              )}
              <Label className="text-sm font-medium">{label}</Label>
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
          </div>
        </div>
      </div>
    </div>
  );
};
