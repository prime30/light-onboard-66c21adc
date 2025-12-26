import { useState } from "react";
import { Info, Check, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { cn } from "@/lib/utils";
import { useForm } from "../context";

export const WholesaleTermsStep = () => {
  const {
    watch,
    setValue,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    showValidationErrors,
  } = useForm();

  const [showTerms, setShowTerms] = useState(false);

  // Watch form values
  const agreed = watch("wholesaleAgreed");

  const validationStatus = getStepValidationStatus(currentStep);
  const agreementError = showValidationErrors && !agreed;

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
          Do you agree to wholesale terms?
        </h1>
      </div>

      <div className="flex gap-[15px] pl-5 border-l-2 border-border animate-stagger-2">
        <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-muted-foreground/70 leading-relaxed">
          As a wholesale member, you get exclusive professional pricing. To keep your account in
          good standing, please use your own payment method for all purchases.
        </p>
      </div>

      <button
        data-field="wholesale-terms"
        onClick={() => setValue("wholesaleAgreed", agreed ? undefined : true)}
        className={cn(
          "w-full p-[25px] rounded-form border-2 text-left transition-all duration-300 flex items-center gap-5 animate-stagger-3 hover:-translate-y-0.5 active:scale-[0.99]",
          agreed
            ? "border-foreground bg-foreground/8"
            : agreementError
              ? "border-destructive/50 bg-destructive/5"
              : "border-border hover:border-foreground/30 hover:bg-muted/60"
        )}
        aria-pressed={agreed}
      >
        <div
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
            agreed
              ? "border-foreground bg-foreground"
              : agreementError
                ? "border-destructive/50"
                : "border-muted-foreground/50"
          )}
        >
          {agreed && (
            <Check className="w-4 h-4 text-background" strokeWidth={3} aria-hidden="true" />
          )}
        </div>
        <span
          className={cn(
            "text-sm font-medium",
            agreementError ? "text-destructive" : "text-foreground"
          )}
        >
          Yes, I agree to{" "}
          <span className="font-bold uppercase relative inline-block px-1.5 py-0.5 mx-0.5 bg-destructive/15 text-destructive rounded after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-destructive after:origin-left after:animate-[underline-grow_0.6s_ease-out_forwards]">
            NOT
          </span>{" "}
          use my client's card to purchase.*
        </span>
      </button>

      {/* Terms of Service link - always visible */}
      <div className="flex justify-center animate-stagger-4">
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="group story-link inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>View Terms of Service</span>
          <ArrowUpRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {agreementError && (
        <p className="text-xs text-destructive text-center">
          Please agree to the wholesale terms to continue
        </p>
      )}

      {/* Terms of Service Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Terms of Service</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">Last updated: December 2024</p>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">1. Acceptance of Terms</h3>
                <p>
                  By accessing and using Drop Dead Gorgeous ("the Platform"), you accept and agree
                  to be bound by these Terms of Service. If you do not agree to these terms, please
                  do not use our services.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">2. Professional Verification</h3>
                <p>
                  Our platform is exclusively for licensed beauty professionals. By registering, you
                  confirm that you hold a valid cosmetology license, are enrolled in an accredited
                  cosmetology program, or hold equivalent professional credentials. We reserve the
                  right to verify your professional status and terminate accounts that do not meet
                  our requirements.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">3. Account Responsibilities</h3>
                <p>
                  You are responsible for maintaining the confidentiality of your account
                  credentials and for all activities under your account. You agree to notify us
                  immediately of any unauthorized access or security breach.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">4. Wholesale Pricing</h3>
                <p>
                  Wholesale pricing is available exclusively to verified professionals. Resale of
                  products purchased at wholesale prices to non-professionals or general consumers
                  is prohibited and may result in account termination.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">5. Orders and Payment</h3>
                <p>
                  All orders are subject to acceptance and product availability. Prices are subject
                  to change without notice. Payment is due at the time of purchase unless otherwise
                  agreed upon in writing.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">6. Shipping and Returns</h3>
                <p>
                  Shipping times and costs vary by location and order size. Returns are accepted
                  within 30 days of delivery for unopened products in original packaging. Defective
                  products may be returned for full refund or replacement.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">7. Limitation of Liability</h3>
                <p>
                  Drop Dead Gorgeous shall not be liable for any indirect, incidental, special, or
                  consequential damages arising from your use of the platform or products purchased
                  through it.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">8. Changes to Terms</h3>
                <p>
                  We reserve the right to modify these terms at any time. Continued use of the
                  platform after changes constitutes acceptance of the modified terms.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">9. Contact</h3>
                <p>
                  For questions about these Terms of Service, please contact us at
                  legal@dropdeadgorgeous.com
                </p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
