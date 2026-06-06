import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "../components/Modal";
import { monthCounts, CAL_START, CAL_END } from "../data/calendar";
import type { Month } from "../types";

export function CalendarModal({
  cal,
  setCal,
  onClose,
}: {
  cal: Month;
  setCal: (m: Month) => void;
  onClose: () => void;
}) {
  const calCounts = monthCounts(cal.year, cal.month);
  const calLabel = new Date(cal.year, cal.month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const atStart = cal.year === CAL_START.year && cal.month === CAL_START.month;
  const atEnd = cal.year === CAL_END.year && cal.month === CAL_END.month;
  const stepMonth = (dir: number) => {
    const d = new Date(cal.year, cal.month + dir, 1);
    setCal({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Modal title={calLabel} onClose={onClose}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Problems solved each day. Hover a square for the count.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepMonth(-1)}
            disabled={atStart}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => stepMonth(1)}
            disabled={atEnd}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {Array.from({ length: new Date(cal.year, cal.month, 1).getDay() }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {calCounts.map((count, i) => {
          const tone =
            count >= 3
              ? "bg-coral text-white"
              : count === 2
              ? "bg-coral/55 text-white"
              : count === 1
              ? "bg-coral/25 text-coral"
              : "bg-muted text-muted-foreground";
          return (
            <div
              key={i}
              title={`${i + 1}: ${count} solved`}
              className={`group/day relative flex aspect-square cursor-default items-center justify-center rounded-xl text-sm font-medium ${tone}`}
            >
              {i + 1}
              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-lg transition group-hover/day:opacity-100">
                {count} solved
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
        Less
        <span className="h-3 w-3 rounded bg-muted" />
        <span className="h-3 w-3 rounded bg-coral/25" />
        <span className="h-3 w-3 rounded bg-coral/55" />
        <span className="h-3 w-3 rounded bg-coral" />
        More
      </div>
    </Modal>
  );
}
