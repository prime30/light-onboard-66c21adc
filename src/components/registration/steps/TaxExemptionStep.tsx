import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Info, Check, ArrowUpRight, Calendar } from "lucide-react";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { cn } from "@/lib/utils";
import { useForm } from "../context";
import blogResaleLicense from "@/assets/blog-resale-license.jpg";
import { MultiFileUpload } from "../MultiFileUpload";
import { UploadFileItem } from "@/contexts";

export const TaxExemptionStep = () => {
  const {
    watch,
    setValue,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    showValidationErrors,
    errors,
  } = useForm();

  const [showToast, setShowToast] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const fileUploadRef = useRef<HTMLDivElement>(null);

  // Watch form values
  const watchedValues = watch(["hasTaxExemption", "taxExemptFile"]);
  const [hasTaxExemption, taxExemptFile] = watchedValues;

  const validationStatus = getStepValidationStatus(currentStep);
  const selectionError = showValidationErrors && hasTaxExemption === null;
  const fileError = showValidationErrors && hasTaxExemption === true && taxExemptFile === null;

  const handleYesClick = () => {
    if (hasTaxExemption === true) {
      setValue("hasTaxExemption", null);
      setValue("taxExemptFile", null);
      return;
    }
    setValue("hasTaxExemption", true);
    setShowToast(false);
    // Scroll to file upload after a brief delay for animation
    setTimeout(() => {
      fileUploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  const handleNoClick = () => {
    if (hasTaxExemption === false) {
      setValue("hasTaxExemption", null);
      setShowToast(false);
      return;
    }
    setValue("hasTaxExemption", false);
    setValue("taxExemptFile", null);
    setShowToast(true);
    setToastKey((prev) => prev + 1);
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
          Do you have a tax exemption?
        </h1>
      </div>

      <div className="flex gap-[15px] pl-5 border-l-2 border-border animate-stagger-2">
        <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground/70 leading-relaxed">
          A tax exemption certificate isn't required to register. If you have one, upload it to
          avoid sales tax on your orders.
        </p>
      </div>

      <div className="space-y-[10px] animate-stagger-3">
        <div className="grid grid-cols-2 gap-[15px]">
          <button
            onClick={handleYesClick}
            className={cn(
              "p-[25px] rounded-form border-2 text-left transition-all duration-300 flex items-center gap-5 hover:-translate-y-0.5 active:scale-[0.99]",
              hasTaxExemption === true
                ? "border-foreground bg-foreground/8"
                : selectionError
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border hover:border-foreground/30 hover:bg-muted/60"
            )}
          >
            <div
              data-field="tax-exemption-yes"
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
                hasTaxExemption === true
                  ? "border-foreground bg-foreground"
                  : selectionError
                    ? "border-destructive/50"
                    : "border-muted-foreground/50"
              )}
            >
              {hasTaxExemption === true && (
                <Check className="w-4 h-4 text-background" strokeWidth={3} />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                selectionError ? "text-destructive" : "text-foreground"
              )}
            >
              Yes
            </span>
          </button>
          <button
            onClick={handleNoClick}
            className={cn(
              "p-[25px] rounded-form border-2 text-left transition-all duration-300 flex items-center gap-5 hover:-translate-y-0.5 active:scale-[0.99]",
              hasTaxExemption === false
                ? "border-foreground bg-foreground/8"
                : selectionError
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-border hover:border-foreground/30 hover:bg-muted/60"
            )}
          >
            <div
              data-field="tax-exemption-no"
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
                hasTaxExemption === false
                  ? "border-foreground bg-foreground"
                  : selectionError
                    ? "border-destructive/50"
                    : "border-muted-foreground/50"
              )}
            >
              {hasTaxExemption === false && (
                <Check className="w-4 h-4 text-background" strokeWidth={3} />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                selectionError ? "text-destructive" : "text-foreground"
              )}
            >
              No
            </span>
          </button>
        </div>
        {selectionError && (
          <p className="text-xs text-destructive text-center">Please select an option</p>
        )}
      </div>

      {/* Blog card when No is selected */}
      <div
        className={cn(
          "grid transition-all duration-400",
          showToast && hasTaxExemption === false
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
        style={{
          transitionTimingFunction: showToast ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease-out",
        }}
      >
        <div className="overflow-hidden space-y-[15px] px-2 -mx-2 pb-[15px] -mb-[15px]">
          {/* Intro text */}
          <p
            key={`intro-${toastKey}`}
            className="text-sm text-muted-foreground text-center animate-fade-in"
          >
            That's ok! It's not needed to register, and you can add it to your account later. Here's
            some info in case you want to learn more
          </p>

          {/* Blog card */}
          <div
            key={`card-${toastKey}`}
            className="rounded-xl border border-border/50 p-4 pb-5 bg-background hover:shadow-card-hover transition-shadow duration-300 animate-[slideUpFade_0.5s_cubic-bezier(0.34,1.56,0.64,1)_0.15s_both]"
          >
            <Link
              to="/blog/resale-license"
              key={toastKey}
              className="relative block rounded-md bg-background hover:opacity-90 transition-all duration-300 group"
            >
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden rounded-md">
                <img
                  src={blogResaleLicense}
                  alt="Professional reviewing business documents"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium uppercase tracking-wider">
                    Licensing
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-background/20 backdrop-blur-md text-background text-[10px] font-medium uppercase tracking-wider border border-background/30">
                    Optional
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="pt-4">
                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Dec 15, 2024</span>
                  </div>
                  <span>·</span>
                  <span>5 min read</span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors">
                  Here's how to save from paying sales tax
                </h3>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  Understanding the importance of a resale license can save you money and keep your
                  business compliant.
                </p>

                {/* Read more */}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  Read more
                  <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* File upload - shown when Yes is selected */}
      <div
        ref={fileUploadRef}
        className={cn(
          "grid transition-all duration-400",
          hasTaxExemption === true ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
        style={{
          transitionTimingFunction:
            hasTaxExemption === true ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease-out",
        }}
      >
        <div className="overflow-hidden">
          <div
            className={cn(hasTaxExemption === true && "animate-haptic-pop")}
            data-field="tax-document"
          >
            <MultiFileUpload
              files={taxExemptFile || []}
              onFilesChange={(files: UploadFileItem[]) => setValue("taxExemptFile", files)}
              placeholder="Upload your state tax-exempt license"
              error={!!errors.taxExemptFile}
              errorMessage="Please upload your tax exemption document"
              maxFiles={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
