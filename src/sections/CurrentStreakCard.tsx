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

export function CurrentStreakCard({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const { calendar } = useData();
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
