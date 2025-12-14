import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/50 mb-2">
          <Sparkles className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Preview
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight">Only for preview purposes</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          This is only for preview when the modal is closed
        </p>
        <Button
          size="lg"
          onClick={() => navigate("/auth")}
          className="h-12 px-8 rounded-xl bg-foreground text-background hover:bg-foreground/90"
        >
          Open Registration modal
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Index;