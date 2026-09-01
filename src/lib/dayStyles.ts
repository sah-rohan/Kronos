import type { DayState } from "./calendar";

/**
 * How each calendar day state looks — audit finding #4.
 *
 * This is the shared definition the grid cells AND the legend swatches both
 * call. That shared call is the mechanism: a legend entry cannot show a colour
 * the grid does not use, which is the class of drift that made the old calendar
 * (and the old difficulty chart) unreadable.
 *
 * Lives in `lib/` rather than beside the legend component because a file that
 * exports both a component and a function breaks Fast Refresh
 * (`react-refresh/only-export-components`).
 *
 * `today` carries a ring as well as a fill, so it is distinguishable by shape
 * and not by colour alone.
 */
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

/**
 * The legend swatch drops the ring offset (which needs a background to sit
 * against and looks wrong at 12px) but keeps the identical fill token, so the
 * swatch and the mark are provably the same colour value.
 */
export function dayStateSwatchClass(state: DayState): string {
  return dayStateClass(state)
    .replace(" ring-offset-2", "")
    .replace(" ring-offset-card", "")
    .replace(" font-semibold", "");
}

/** Every state a day cell can take, each with the text that names it. */
export const DAY_LEGEND_ENTRIES: { state: DayState; label: string }[] = [
  { state: "today", label: "Today" },
  { state: "streak", label: "Streak day" },
  { state: "solved", label: "Solved" },
  { state: "empty", label: "No solves" },
];
