import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";

const Index = () => {
  const [authOpen, setAuthOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary via-background to-background" />
      
      <div className="relative z-10 text-center">
        <h1 className="text-4xl font-semibold text-foreground mb-4">
          Welcome to StylePro
        </h1>
        <p className="text-muted-foreground mb-8">
          Professional tools for beauty professionals
        </p>
        <Button
          size="lg"
          className="rounded-xl px-8"
          onClick={() => setAuthOpen(true)}
        >
          Get Started
        </Button>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Index;
