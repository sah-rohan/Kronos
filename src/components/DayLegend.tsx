import { DAY_LEGEND_ENTRIES, dayStateSwatchClass } from "../lib/dayStyles";

/**
 * The calendar legend — audit finding #4.
 *
 * The old grid had four visually distinct cell treatments and explained none of
 * them, so "a day you solved something" and "today" were indistinguishable and
 * the most saturated cell was read as today. Every state a cell can take now has
 * an entry here, painted from the same source as the cell itself
 * (`lib/dayStyles.ts`).
 */
export function DayLegend({ className = "" }: { className?: string }) {
  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground ${className}`}
    >
      {DAY_LEGEND_ENTRIES.map((e) => (
        <li key={e.state} className="flex items-center gap-1.5">
          {/*
            Decorative: the adjacent text is the real label, so a screen reader
            reads "Today" once rather than describing a colour.
          */}
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
