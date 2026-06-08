import { ChevronDown } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { ROADMAPS, ROADMAP_LABEL, inList } from "../lib/roadmaps";
import type { ProblemList } from "../types";

export function MyProgressCard({
  onOpen,
  roadmap,
  onRoadmap,
}: {
  onOpen: () => void;
  roadmap: ProblemList;
  onRoadmap: (r: ProblemList) => void;
}) {
  const { categories } = useData();
  const items = categories.flatMap((c) => c.items).filter((p) => inList(p, roadmap));
  const total = items.length;
  const solved = items.filter((p) => p.done).length;
  const pct = total ? Math.round((solved / total) * 100) : 0;

  const bars = (["Easy", "Medium", "Hard"] as const).map((label) => {
    const di = items.filter((p) => p.diff === label);
    return {
      label,
      color: label === "Easy" ? "bg-sky" : label === "Medium" ? "bg-[#f5c26b]" : "bg-coral",
      done: di.filter((p) => p.done).length,
      total: di.length,
    };
  });

  return (
    <Card className="lg:col-span-1" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">My Progress</div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <select
            value={roadmap}
            onChange={(e) => onRoadmap(e.target.value as ProblemList)}
            className="appearance-none rounded-full border border-border bg-transparent py-1 pl-3 pr-7 text-xs font-medium text-muted-foreground outline-none transition hover:bg-muted"
          >
            {ROADMAPS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-[40px] leading-none tracking-tight">{solved}</div>
        <div className="text-sm text-muted-foreground">/ {total} solved</div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{ROADMAP_LABEL[roadmap]}</div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-coral" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-6 space-y-4">
        {bars.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                {s.label}
              </span>
              <span className="font-medium tabular-nums">
                {s.done}
                <span className="text-muted-foreground"> / {s.total}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${s.color}`} style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
