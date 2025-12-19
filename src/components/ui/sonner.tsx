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
      style={{ bottom: '80px' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-aeonik group-[.toaster]:bg-white/70 group-[.toaster]:dark:bg-black/50 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-white/30 group-[.toaster]:dark:border-white/10 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.12)] group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:bg-destructive/20 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-destructive group-[.toaster]:border-destructive/30",
          success: "group-[.toaster]:bg-emerald-500/20 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-emerald-700 group-[.toaster]:dark:text-emerald-300 group-[.toaster]:border-emerald-500/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
