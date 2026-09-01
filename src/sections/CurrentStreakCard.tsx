import { Calendar, Flame } from "lucide-react";
import { EntryPoint } from "../components/EntryPoint";
import { DayLegend } from "../components/DayLegend";
import { dayStateClass } from "../lib/dayStyles";
import { useData } from "../data/context";
import {
  dayState,
  monthGridCells,
  streakKeys,
  useToday,
  formatDayLabel,
} from "../lib/calendar";

/**
 * Audit finding #4, as actually diagnosed.
 *
 * The report said "August 4th was highlighted in bright red as if it were today,
 * while the header read Thu, August 27". Reproducing it against the code showed
 * the audit's three hypotheses (cell-index vs day-of-month, month off-by-one,
 * UTC boundary in the highlight) were all wrong. There was **no today marker at
 * all**. Cell colour was purely a solve-count heat ramp — `count >= 3` painted
 * full-strength coral, `count === 2` and `count === 1` painted translucent
 * variants. August 4th was simply the day with the most solves, and the most
 * saturated cell was reasonably read as "today". The "unexplained dark maroon"
 * on the 17th, 20th, 26th and 27th was the same ramp at lower opacity.
 *
 * There *was* a real UTC bug, just not in the highlight: the header was rendered
 * with `timeZone: "UTC"` while the grid was built from UTC getters, so for
 * anyone west of Greenwich in the evening the header showed tomorrow's date.
 * That is the "Thu, August 27" half of the report.
 *
 * Both are fixed here: a single `useToday()` feeds the header and the grid, all
 * comparisons run on local `YYYY-MM-DD` keys, and the three meaningful states
 * (Today / Streak day / Solved) are distinct, legended and named in text.
 */
export function CurrentStreakCard({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const { calendar } = useData();
  // ONE today, shared by the header and the grid below.
  const today = useToday();

  const streak = streakKeys(calendar.byDate, today.key);
  const cells = monthGridCells(
    today.date.getFullYear(),
    today.date.getMonth(),
    today.key,
  );
  const leadPad = cells[0]?.weekdayIndex ?? 0;

  const todayLabel = today.date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });

  return (
    <EntryPoint
      onSelect={onOpenCalendar}
      action="Open calendar"
      ariaLabel={`Open calendar — ${streak.size} day streak`}
      className="h-full lg:col-span-1"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-coral" /> Current Streak
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="font-display text-[56px] leading-none tracking-tight">
              {streak.size}
            </div>
            <div className="text-sm text-muted-foreground">day streak</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> {todayLabel}
        </div>
      </div>

      <div className="mt-5 flex flex-1 items-center justify-center">
        <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="This month">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              role="columnheader"
              aria-label={d}
              className="grid h-6 w-9 place-items-center text-[10px] font-medium text-muted-foreground"
            >
              {d[0]}
            </div>
          ))}
          {Array.from({ length: leadPad }, (_, i) => (
            <div key={`pad-${i}`} className="h-9 w-9" role="presentation" />
          ))}
          {cells.map((cell) => {
            const count = calendar.byDate[cell.key] ?? 0;
            const state = dayState(cell.key, today.key, count, streak);
            const solvedText =
              count === 0 ? "no problems solved" : `${count} solved`;
            const stateText =
              state === "today"
                ? "today"
                : state === "streak"
                  ? "streak day"
                  : "";
            return (
              <div
                key={cell.key}
                role="gridcell"
                aria-current={state === "today" ? "date" : undefined}
                aria-label={[formatDayLabel(cell.key), solvedText, stateText]
                  .filter(Boolean)
                  .join(", ")}
                className={`grid h-9 w-9 place-items-center rounded-md text-[11px] font-medium ${dayStateClass(state)}`}
              >
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>

      <DayLegend className="mt-4" />
    </EntryPoint>
  );
}
