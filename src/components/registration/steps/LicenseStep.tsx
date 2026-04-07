import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { cn } from "@/lib/utils";
import { useForm } from "../context";

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

  // Watch form values
  const watchedValues = watch(["accountType", "licenseNumber", "licenseProofFiles"]);
  const [accountType, licenseNumber, licenseProofFiles] = watchedValues;

  const isSalon = accountType === "salon";
  const label = isSalon ? (
    "Upload your salon license*"
  ) : (
    <>
      Upload license photo <span className="text-muted-foreground font-normal">(optional)</span>
    </>
  );
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
          Provide your license number
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          {isSalon
            ? "Let us make sure you are a salon manager"
            : "Enter your cosmetology license details"}
        </p>
      </div>

      <div className="flex gap-[15px] pl-5 border-l-2 border-border animate-stagger-2">
        <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground/70 leading-relaxed">
          {isSalon
            ? "Wholesale pricing shown is exclusive to verified professionals."
            : "Please enter your license exactly as it appears from the state."}
        </p>
      </div>

      <div className="space-y-5">
        {/* License Number */}
        <div className="animate-stagger-3">
          <TextInput
            name="licenseNumber"
            type="text"
            register={register}
            error={errors.licenseNumber}
            placeholder={isSalon ? "Salon License #" : "Enter your license number"}
            label={isSalon ? "Salon License #*" : "License number*"}
            isValid={getValidationStatus("licenseNumber") === "complete"}
          />
        </div>

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

        {/* Professional-specific file upload (optional) - shows after 3+ characters in license number */}
        <div
          className={cn(
            "grid transition-all duration-400 animate-stagger-4",
            (licenseNumber?.trim()?.length || 0) >= 3
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
          style={{
            transitionTimingFunction:
              (licenseNumber?.trim()?.length || 0) >= 3
                ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "ease-out",
          }}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-2.5",
                (licenseNumber?.trim()?.length || 0) >= 3 && "animate-haptic-pop"
              )}
            >
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
