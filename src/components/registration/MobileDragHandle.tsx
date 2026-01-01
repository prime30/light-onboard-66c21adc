import { cn } from "@/lib/utils";

type MobileDragHandleProps = {
  modalDragOffset: number;
};

export function MobileDragHandle({ modalDragOffset }: MobileDragHandleProps) {
  return (
    <div
      className={cn(
        "sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full z-10 transition-all duration-150",
        modalDragOffset >= 100
          ? "bg-destructive/60 w-12 scale-110"
          : modalDragOffset > 50
            ? "bg-muted-foreground/50 w-11"
            : "bg-muted-foreground/30"
      )}
    />
  );
}
