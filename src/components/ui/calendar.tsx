import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-5",
        caption: "flex justify-center pt-1 relative items-center px-1",
        caption_label: "text-sm font-semibold tracking-tight",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-8 w-8 bg-muted/50 hover:bg-muted border border-border/50 rounded-xl p-0 inline-flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex gap-1 mb-2",
        head_cell: "text-muted-foreground/70 rounded-lg w-10 font-medium text-[0.7rem] uppercase tracking-wider",
        row: "flex w-full gap-1 mt-1",
        cell: cn(
          "relative h-10 w-10 text-center text-sm p-0 focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-primary/10 [&:has([aria-selected])]:rounded-xl",
          "[&:has([aria-selected].day-outside)]:bg-primary/5",
          "[&:has([aria-selected].day-range-end)]:rounded-r-xl",
          "first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl"
        ),
        day: cn(
          "h-10 w-10 p-0 font-normal rounded-xl transition-all duration-200",
          "hover:bg-muted hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1",
          "aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-foreground text-background rounded-xl",
          "hover:bg-foreground hover:text-background",
          "focus:bg-foreground focus:text-background",
          "shadow-sm"
        ),
        day_today: cn(
          "bg-primary/10 text-foreground font-semibold",
          "ring-1 ring-primary/30"
        ),
        day_outside: cn(
          "day-outside text-muted-foreground/40",
          "aria-selected:bg-primary/5 aria-selected:text-muted-foreground/60"
        ),
        day_disabled: "text-muted-foreground/30 hover:bg-transparent hover:scale-100 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
