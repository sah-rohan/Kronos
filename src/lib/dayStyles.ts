// Shared by the grid cells and the legend swatches, so a legend entry cannot show a colour the grid does not use.
// Lives in lib/ because a file exporting both a component and a function breaks Fast Refresh.
import type { DayState } from "./calendar";

export function dayStateClass(state: DayState): string {
  switch (state) {
    case "today":
      return "bg-streak-today text-streak-today-foreground ring-2 ring-streak-today ring-offset-2 ring-offset-card font-semibold";
    case "streak":
      return "bg-streak-active text-streak-active-foreground";
    case "solved":
      return "bg-streak-solved text-streak-solved-foreground";
    case "empty":
      return "bg-streak-empty text-streak-empty-foreground";
  }
}

export function dayStateSwatchClass(state: DayState): string {
  return dayStateClass(state)
    .replace(" ring-offset-2", "")
    .replace(" ring-offset-card", "")
    .replace(" font-semibold", "");
}

export const DAY_LEGEND_ENTRIES: { state: DayState; label: string }[] = [
  { state: "today", label: "Today" },
  { state: "streak", label: "Streak day" },
  { state: "solved", label: "Solved" },
  { state: "empty", label: "No solves" },
];
