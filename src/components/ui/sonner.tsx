import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      style={{ bottom: "80px" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-grotesk group-[.toaster]:bg-background/95 group-[.toaster]:dark:bg-background/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-toast group-[.toaster]:rounded-lg group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error:
            "group-[.toaster]:bg-[hsl(var(--status-red)/0.12)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-[hsl(var(--status-red))] group-[.toaster]:border-[hsl(var(--status-red)/0.3)] group-[.toaster]:shadow-toast",
          success:
            "group-[.toaster]:bg-[hsl(var(--status-green)/0.12)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-[hsl(var(--status-green))] group-[.toaster]:border-[hsl(var(--status-green)/0.3)] group-[.toaster]:shadow-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
