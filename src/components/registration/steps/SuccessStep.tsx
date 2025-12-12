import { Check } from "lucide-react";

export const SuccessStep = () => {
  return (
    <div className="animate-fade-in text-center max-w-md mx-auto py-12">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mx-auto mb-6">
        <Check className="w-8 h-8 text-card" strokeWidth={2.5} />
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
        You're all set!
      </h1>
      
      <p className="text-muted-foreground leading-relaxed mb-8">
        Your account has been created successfully. You can now start shopping with your professional perks.
      </p>

      <div className="p-4 rounded-xl bg-muted">
        <p className="text-sm text-muted-foreground">
          A confirmation email has been sent to your inbox.
        </p>
      </div>
    </div>
  );
};
