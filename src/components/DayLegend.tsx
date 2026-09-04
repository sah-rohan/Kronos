import { DAY_LEGEND_ENTRIES, dayStateSwatchClass } from "../lib/dayStyles";

export function DayLegend({ className = "" }: { className?: string }) {
  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground ${className}`}
    >
      {DAY_LEGEND_ENTRIES.map((e) => (
        <li key={e.state} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-3 w-3 shrink-0 rounded-sm ${dayStateSwatchClass(e.state)}`}
          />
          {e.label}
        </li>
      ))}
    </ul>
  );
}
