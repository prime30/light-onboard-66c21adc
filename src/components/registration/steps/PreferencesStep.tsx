import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepValidationIcon } from "@/components/registration/StepValidationIcon";
import { TextInput } from "@/components/TextInput";
import { SelectInput } from "@/components/SelectInput";
import { dirtyFieldOptions, useForm } from "../context";

export const PreferencesStep = () => {
  const {
    register,
    control,
    watch,
    errors,
    currentStep,
    getStepValidationStatus,
    getStepNumber,
    setValue,
  } = useForm();

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Watch form values
  const watchedValues = watch(["subscribeOrderUpdates", "acceptsMarketing"]);

  const [subscribeOrderUpdates, acceptsMarketing] = watchedValues;

  const validationStatus = getStepValidationStatus(currentStep);

  // SMS notice visibility with exit animation
  const hasPreferenceSelected = subscribeOrderUpdates || acceptsMarketing;
  const [showSmsNotice, setShowSmsNotice] = useState(hasPreferenceSelected);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (hasPreferenceSelected) {
      setIsExiting(false);
      setShowSmsNotice(true);
    } else if (showSmsNotice) {
      // Start exit animation
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShowSmsNotice(false);
        setIsExiting(false);
      }, 200); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [hasPreferenceSelected, showSmsNotice]);

  // Create month options
  const monthOptions = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Create day options
  const dayOptions = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    return {
      value: day.toString().padStart(2, "0"),
      label: day.toString(),
    };
  });

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
          Preferences & Details
        </h1>
      </div>

      <div className="space-y-5">
        {/* Birthday (Optional) */}
        <div className="space-y-2.5 animate-stagger-2 group">
          <div className="grid grid-cols-2 gap-2.5">
            <SelectInput
              name="birthdayMonth"
              control={control}
              error={errors.birthdayMonth}
              options={monthOptions}
              label={
                <>
                  Birthday <span className="text-muted-foreground font-normal">(optional)</span>
                </>
              }
              placeholder="Month"
            />
            <SelectInput
              name="birthdayDay"
              control={control}
              error={errors.birthdayDay}
              options={dayOptions}
              label=" " // Space to align with month label
              placeholder="Day"
              className="mt-6"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            We'll send you a special treat on your birthday!
          </p>
        </div>

        {/* Social Media Handle (Optional) */}
        <div className="animate-stagger-6">
          <TextInput
            name="socialMediaHandle"
            type="text"
            register={register}
            error={errors.socialMediaHandle}
            placeholder="yourusername"
            label={
              <>
                Social media handle{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </>
            }
            prefixIcon={
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
                @
              </span>
            }
            className="[&_input]:pl-9"
          />
          <p className="text-xs text-muted-foreground mt-2.5">
            Instagram, TikTok, or your primary platform
          </p>
        </div>

        {/* Note: Uploaded files display would be handled by parent component if needed */}

        {/* Subscription Preferences */}
        <div
          className={cn(
            "space-y-[15px] p-5 rounded-form bg-muted border border-border/50",
            "animate-stagger-7"
          )}
        >
          <p className="text-sm font-medium text-foreground">Communication Preferences</p>
          <div className="space-y-[15px]">
            <label className="flex items-start gap-[15px] cursor-pointer group">
              <Checkbox
                checked={subscribeOrderUpdates || false}
                onCheckedChange={(checked) => {
                  setValue("subscribeOrderUpdates", !!checked, dirtyFieldOptions);
                }}
                className="mt-2 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors flex items-center gap-2">
                  Order updates
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Recommended
                  </span>
                </span>
                <p className="text-xs text-muted-foreground">
                  Receive shipping notifications and order status updates
                </p>
              </div>
            </label>
            <label className="flex items-start gap-[15px] cursor-pointer group">
              <Checkbox
                checked={acceptsMarketing || false}
                onCheckedChange={(checked) => {
                  setValue("acceptsMarketing", !!checked, dirtyFieldOptions);
                }}
                className="mt-2 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors flex items-center gap-2">
                  Promotions & deals
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Recommended
                  </span>
                </span>
                <p className="text-xs text-muted-foreground">
                  Exclusive discounts, sales, and special offers
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* SMS Consent Notice - only shows when a preference is selected */}
        {showSmsNotice && (
          <div
            className={cn(
              "flex gap-[15px] pl-5 border-l-2 border-border transition-all duration-200",
              isExiting
                ? "opacity-0 translate-y-2"
                : "opacity-100 translate-y-0 animate-in fade-in slide-in-from-bottom-2 duration-300",
              "animate-stagger-6"
            )}
          >
            <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              You may receive text messages about orders, promos, and updates. Msg & data rates may
              apply. Reply STOP to cancel. View our{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Terms
              </button>
              {" & "}
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        )}
      </div>

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

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Privacy Policy</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">Last updated: December 2024</p>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">1. Information We Collect</h3>
                <p>
                  We collect information you provide directly, including: name, email, phone number,
                  business information, professional license details, and payment information. We
                  also collect usage data automatically when you interact with our platform.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">2. How We Use Your Information</h3>
                <p>
                  We use your information to: process orders and payments, verify professional
                  credentials, communicate about orders and promotions, improve our services, and
                  comply with legal obligations.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">3. Information Sharing</h3>
                <p>
                  We do not sell your personal information. We may share information with: service
                  providers who assist our operations, payment processors, shipping carriers, and as
                  required by law.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">4. Data Security</h3>
                <p>
                  We implement industry-standard security measures to protect your information,
                  including encryption, secure servers, and regular security audits. However, no
                  method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">5. Your Rights</h3>
                <p>
                  You have the right to: access your personal information, correct inaccurate data,
                  request deletion of your data, opt out of marketing communications, and request a
                  copy of your data.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">6. Cookies and Tracking</h3>
                <p>
                  We use cookies and similar technologies to enhance your experience, analyze usage,
                  and deliver targeted advertising. You can manage cookie preferences through your
                  browser settings.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">7. SMS Communications</h3>
                <p>
                  By providing your phone number, you consent to receive SMS messages about orders,
                  promotions, and updates. Message and data rates may apply. Reply STOP to
                  unsubscribe at any time.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">8. Children's Privacy</h3>
                <p>
                  Our platform is not intended for individuals under 18 years of age. We do not
                  knowingly collect information from children.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">9. Changes to This Policy</h3>
                <p>
                  We may update this Privacy Policy periodically. We will notify you of significant
                  changes via email or platform notification.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-medium">10. Contact Us</h3>
                <p>For privacy-related inquiries, contact us at privacy@dropdeadgorgeous.com</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
