import { ShieldCheck, AlertCircle } from "lucide-react";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { FilePreviewGrid } from "@/components/registration/FilePreviewThumbnail";
import { useForm } from "@/components/registration/context/FormContext";
import { countryCodes } from "@/data/country-codes";
import { getCredentialConfig, QUALIFICATION_LABEL } from "@/data/qualifications";
import { AccountType, BusinessOperationType, Step } from "@/types/auth";
import { AllRegistrationFormData } from "@/lib/validations/auth-schemas";
import { UploadFileItem } from "@/lib/validations/file-schema";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { AuGeoVerificationGate } from "@/components/registration/AuGeoVerificationGate";

const SummarySection = ({
  title,
  field,
  fallbackStep,
  children,
}: {
  title: string;
  field: keyof AllRegistrationFormData;
  fallbackStep?: Step;
  children: React.ReactNode;
}) => {
  const { steps, getStepForField, goToStep } = useForm();
  const owningStep = getStepForField(field);
  const resolved = owningStep && steps.includes(owningStep)
    ? owningStep
    : fallbackStep && steps.includes(fallbackStep)
      ? fallbackStep
      : undefined;
  return (
    <div className="space-y-2 p-4 rounded-form bg-muted border border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {resolved && (
          <button
            type="button"
            onClick={() => goToStep(resolved)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
      <div className="space-y-1.5 text-sm text-muted-foreground">{children}</div>
    </div>
  );
};


const SummaryRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
};


const getAccountTypeLabel = (accountType: AccountType) => {
  if (accountType === "professional") return "Professional Stylist";
  if (accountType === "student") return "Cosmetology Student";
  if (accountType === "salon") return "Salon / Business";
  return "";
};

const getBusinessOperationLabel = (businessOperation: BusinessOperationType) => {
  if (businessOperation === "commission") return "Commission-based (work at a salon)";
  if (businessOperation === "independent") return "Independent (booth rent / freelance)";
  return "";
};

const getSalonSizeLabel = (salonSize: string) => {
  if (salonSize === "1") return "Just me (solo)";
  if (salonSize === "2-5") return "2-5 stylists";
  if (salonSize === "6-10") return "6-10 stylists";
  if (salonSize === "11+") return "11+ stylists";
  return salonSize;
};

const getSalonStructureLabel = (salonStructure: string) => {
  if (salonStructure === "owner") return "I own the salon";
  if (salonStructure === "manager") return "I manage the salon";
  if (salonStructure === "booth") return "I rent a booth/chair";
  return salonStructure;
};

const formatPhoneDisplay = (phoneCountryCode: string, phoneNumber: string) => {
  if (!phoneNumber) return "";
  const code = countryCodes.find((c) => c.iso === phoneCountryCode)?.code || "";
  return `${code} ${phoneNumber}`;
};

export const SummaryForm = () => {
  const { watch, currentStep, getStepNumber, errors, errorActions, submitErrorMessage } = useForm();
  const navigate = useNavigate();
  const errorRef = useRef<HTMLDivElement>(null);
  const visibleSubmitError = submitErrorMessage || errors.root?.form?.message;

  // Watch all form values at once
  const formData = watch() as AllRegistrationFormData & {
    qualification?: string;
  };
  const {
    accountType,
    firstName,
    lastName,
    preferredName,
    email,
    phoneNumber,
    phoneCountryCode,
    licenseNumber,
    provinceCode,
    businessName,
    businessAddress,
    suiteNumber,
    city,
    zipCode,
    countryCode,
    schoolName,
    schoolState,
    businessOperationType,
    salonSize,
    salonStructure,
    taxExempt,
    socialMediaHandle,
    
    preferredMethods,
    monthlyOrderVolume,
    qualification,
    licenseProofFiles = [],
    enrollmentProofFiles = [],
    taxExemptFile = [],
  } = formData;
  const country = (countryCode ?? "US").toUpperCase();
  const credentialConfig = getCredentialConfig(country);

  // Type guard for UploadFileItem
  const isUploadFileItem = (file: UploadFileItem | string): file is UploadFileItem => {
    return file && typeof file === "object" && file.file instanceof File;
  };

  const uploadedFiles = [
    ...licenseProofFiles.filter(isUploadFileItem).map((item) => ({
      file: item.file,
      label: "License Document",
    })),
    ...enrollmentProofFiles.filter(isUploadFileItem).map((item) => ({
      file: item.file,
      label: "Enrollment Document",
    })),
    ...taxExemptFile.filter(isUploadFileItem).map((item) => ({
      file: item.file,
      label: "Tax Exemption Document",
    })),
  ];

  // Scroll to error when it appears
  useEffect(() => {
    if (visibleSubmitError && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [visibleSubmitError]);

  // Warm the display fonts used on the upcoming SuccessForm ("Welcome to Drop Dead")
  // so they're parsed and in the FontFaceSet by the time that screen mounts. The
  // index.html `<link rel="prefetch">` already pulled the bytes; this guarantees
  // the browser has decoded them so the success step never shows a swap flash.
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts?.load) return;
    document.fonts.load('300 italic 1em "Canela"').catch(() => {});
    document.fonts.load('500 1em "Aeonik Fono"').catch(() => {});
  }, []);


  return (
    <div className="space-y-[clamp(12px,2vh,25px)]">
      <div className="space-y-[clamp(5px,1vh,10px)] text-center animate-stagger-1">
        <div className="inline-flex items-center gap-2.5 px-[15px] py-[6px] rounded-full bg-muted border border-border/50 mb-[5px] animate-badge-pop">
          <StepValidationIcon status="complete" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
            Step {getStepNumber(currentStep)}
          </span>
        </div>
        <h1 className="font-termina font-medium uppercase text-xl sm:text-2xl md:text-3xl text-foreground leading-[1.1] text-balance">
          Review Your Application
        </h1>
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-3 p-4 rounded-form bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 animate-stagger-2">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Your information is secure and never shared with third parties.
        </p>
      </div>

      <AuGeoVerificationGate
        countryCode={(formData as { countryCode?: string }).countryCode}
        email={email}
      />

      {/* Error Display */}
      {visibleSubmitError && (
        <div
          ref={errorRef}
          className="flex items-start gap-3 p-4 rounded-form bg-destructive/10 border border-destructive/30 animate-stagger-2"
        >
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-3 flex-1">
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Unable to Submit Application
              </p>
              <p className="text-sm text-destructive/80 whitespace-pre-line">
                {visibleSubmitError}
              </p>
            </div>
            {errorActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {errorActions.map((action, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (action.url) {
                        navigate(action.url);
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Account Type */}
        <div className="animate-stagger-2">
          <SummarySection title="Account Type" field="accountType">
            <SummaryRow label="Type" value={getAccountTypeLabel(accountType)} />
          </SummarySection>
        </div>

        {/* Contact Information */}
        <div className="animate-stagger-3">
          <SummarySection
            title="Contact Information"
            field="firstName"
          >
            <SummaryRow label="Name" value={`${firstName} ${lastName}`} />
            {preferredName && <SummaryRow label="Preferred Name" value={preferredName} />}
            <SummaryRow label="Email" value={email} />
            <SummaryRow label="Phone" value={formatPhoneDisplay(phoneCountryCode, phoneNumber)} />
            {socialMediaHandle && (
              <SummaryRow label="Social Media" value={`@${socialMediaHandle}`} />
            )}

          </SummarySection>
        </div>

        {/* Business Operation (Professional only) */}
        {accountType === "professional" && businessOperationType && (
          <div className="animate-stagger-4">
            <SummarySection title="Business Operation" field="businessOperationType">
              <SummaryRow label="Type" value={getBusinessOperationLabel(businessOperationType)} />
            </SummarySection>
          </div>
        )}

        {/* School Information (Student only) */}
        {accountType === "student" && (
          <div className="animate-stagger-4">
            <SummarySection title="School Information" field="schoolName">
              <SummaryRow label="School" value={schoolName} />
              <SummaryRow label="State" value={schoolState} />
            </SummarySection>
          </div>
        )}

        {/* License Information (hidden for AU - no licensing requirements) */}
        {accountType !== "student" && country !== "AU" && (
          <div className="animate-stagger-5">
            <SummarySection
              title="License Information"
              field="licenseNumber"
            >
              <SummaryRow
                label={credentialConfig.licenseFieldLabel(accountType === "salon").replace(/\*$/, "")}
                value={licenseNumber}
              />
              {qualification && QUALIFICATION_LABEL[qualification] && (
                <SummaryRow
                  label="Qualification"
                  value={QUALIFICATION_LABEL[qualification]}
                />
              )}
              {provinceCode && <SummaryRow label="State" value={provinceCode} />}
              {accountType === "salon" && salonSize && (
                <SummaryRow label="Salon Size" value={getSalonSizeLabel(salonSize)} />
              )}
              {accountType === "salon" && salonStructure && (
                <SummaryRow label="Structure" value={getSalonStructureLabel(salonStructure)} />
              )}
            </SummarySection>
          </div>
        )}

        {/* Salon details for AU (no license section, but keep size/structure if provided) */}
        {accountType === "salon" && country === "AU" && (salonSize || salonStructure) && (
          <div className="animate-stagger-5">
            <SummarySection title="Salon Details" field="businessAddress">
              {salonSize && <SummaryRow label="Salon Size" value={getSalonSizeLabel(salonSize)} />}
              {salonStructure && <SummaryRow label="Structure" value={getSalonStructureLabel(salonStructure)} />}
            </SummarySection>
          </div>
        )}

        {/* Business Location */}
        {(accountType === "professional" || accountType === "salon") && !!businessAddress && (
          <div className="animate-stagger-6">
            <SummarySection
              title="Business Location"
              field="businessAddress"
            >
              <SummaryRow label="Business Name" value={businessName} />
              <SummaryRow
                label="Address"
                value={suiteNumber ? `${businessAddress}, ${suiteNumber}` : businessAddress}
              />
              <SummaryRow
                label="City, State Postal"
                value={`${city}, ${provinceCode} ${zipCode}`}
              />
              <SummaryRow label="Country" value={countryCode} />
            </SummarySection>
          </div>
        )}

        {/* Tax Exemption - US only (state sales tax concept) */}
        {country === "US" && (
          <div className="animate-stagger-7">
            <SummarySection
              title="Tax Exemption"
              field="taxExempt"
              fallbackStep="business-location"
            >
              <SummaryRow
                label="Status"
                value={
                  taxExempt === true
                    ? "Tax exempt"
                    : taxExempt === false
                      ? "Not tax exempt"
                      : "Not specified"
                }
              />
            </SummarySection>
          </div>
        )}

        {/* Preferred Method */}
        {preferredMethods && preferredMethods.length > 0 && (
          <div className="animate-stagger-8">
            <SummarySection
              title="Preferred Method"
              field="preferredMethods"
            >
              <SummaryRow label="Selected" value={preferredMethods.join(", ")} />
            </SummarySection>
          </div>
        )}

        {/* Monthly Order Volume (professional + salon) */}
        {(accountType === "professional" || accountType === "salon") && monthlyOrderVolume && (
          <div className="animate-stagger-8">
            <SummarySection
              title="Monthly Order Volume"
              field="monthlyOrderVolume"
            >
              <SummaryRow label="Extensions / month" value={monthlyOrderVolume} />
            </SummarySection>
          </div>
        )}




        {/* Uploaded Documents */}
        {uploadedFiles.length > 0 && (
          <div className="animate-stagger-9">
            <div className="space-y-3 p-4 rounded-form bg-muted border border-border/50">
              <span className="text-sm font-medium text-foreground">Uploaded Documents</span>
              <FilePreviewGrid files={uploadedFiles} size="md" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
