import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { MultiFileUpload } from "@/components/registration/MultiFileUpload";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { cn } from "@/lib/utils";
import { useForm } from "../context";
import { getCredentialConfig, getQualificationOptions } from "@/data/qualifications";

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
  const country = (countryCode ?? "US").toUpperCase();
  const config = getCredentialConfig(country);
  const qualificationOptions = getQualificationOptions(country).map((q) => ({
    value: q.value,
    label: q.label,
  }));
  const isNSW = country === "AU" && (provinceCode ?? "").toUpperCase() === "NSW";

  const uploadLabel = config.uploadCopy(isSalon);
  const validationStatus = getStepValidationStatus(currentStep);

  const salonSizeOptions = salonSizes.map((size) => ({ value: size, label: size }));
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
          {config.h1}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
          {isSalon && country === "US" ? "Let us make sure you are a salon manager" : config.sub}
        </p>
      </div>

      <div className="flex gap-[15px] pl-5 border-l-2 border-border animate-stagger-2">
        <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground/70 leading-relaxed">
          {isSalon && country === "US"
            ? "Wholesale pricing shown is exclusive to verified professionals."
            : config.wholesaleCopy}
        </p>
      </div>

      <div className="space-y-5">
        {/* License / registration number field */}
        <div className="animate-stagger-3 space-y-2">
          <TextInput
            name="licenseNumber"
            type="text"
            register={register}
            error={errors.licenseNumber}
            placeholder={config.licenseFieldPlaceholder(isSalon)}
            label={config.licenseFieldLabel(isSalon)}
            isValid={getValidationStatus("licenseNumber") === "complete"}
          />
        </div>

        {/* Country-specific qualification dropdown (AU/UK/IE/NZ/ZA) */}
        {config.hasQualification && qualificationOptions.length > 0 && (
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

        {/* AU + NSW: informational note. NSW's Hairdressers Act 2003 requires
            SHB30416 (Certificate III) to practise but does NOT issue a
            separate licence number - so we don't ask for one. */}
        {isNSW && (
          <div className="animate-stagger-4 flex gap-[15px] pl-5 border-l-2 border-border">
            <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground/70 leading-relaxed">
              NSW's Hairdressers Act 2003 requires holding Certificate III in Hairdressing (SHB30416) or a recognised equivalent - it doesn't issue a separate licence number. Selecting Cert III above satisfies this requirement.
            </p>
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
              <Label className="text-sm font-medium">{uploadLabel}</Label>
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
