import { useState } from "react";
import { AuthModal } from "@/components/registration/AuthModal";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [authOpen, setAuthOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-semibold text-foreground">Welcome</h1>
        <p className="text-muted-foreground">Get started by creating an account</p>
        <Button
          size="lg"
          onClick={() => setAuthOpen(true)}
          className="h-12 px-8 rounded-xl bg-foreground text-background hover:bg-foreground/90"
        >
          Get Started
        </Button>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Index;
