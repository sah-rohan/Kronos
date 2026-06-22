import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { api } from "../lib/api";
import { ROADMAPS, ROADMAP_LABEL, inList } from "../lib/roadmaps";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import { completedSet } from "../systemdesign/progress";
import type { ProblemList } from "../types";

type View = ProblemList | "sd" | "genai";

const SD_OPTIONS: { key: View; label: string }[] = [
  { key: "sd", label: "System Design" },
  { key: "genai", label: "AI System Design" },
];

export function MyProgressCard({
  onOpen,
  board,
  onBoard,
}: {
  onOpen: () => void;
  board: View;
  onBoard: (b: View) => void;
}) {
  const { categories, getToken } = useData();
  const view = board;
  const isSD = view === "sd" || view === "genai";

  // System Design completions: optimistic local set reconciled with the DB.
  const [sdSolved, setSdSolved] = useState<Set<string>>(() => completedSet());
  useEffect(() => {
    api.sdSolved(getToken).then((s) => setSdSolved(new Set([...completedSet(), ...(s ?? [])]))).catch(() => {});
  }, [getToken]);

  // Build the difficulty buckets + totals for whichever view is active.
  let total: number;
  let solved: number;
  let label: string;
  let bars: { label: string; color: string; done: number; total: number }[];

  if (isSD) {
    const problems = view === "genai" ? GENAI_PROBLEMS : SD_PROBLEMS;
    total = problems.length;
    solved = problems.filter((p) => sdSolved.has(p.slug)).length;
    label = view === "genai" ? "AI System Design" : "System Design";
    bars = (["Easy", "Medium", "Hard"] as const).map((d) => {
      const di = problems.filter((p) => p.difficulty === d);
      return {
        label: d,
        color: d === "Easy" ? "bg-sky" : d === "Medium" ? "bg-[#f5c26b]" : "bg-coral",
        done: di.filter((p) => sdSolved.has(p.slug)).length,
        total: di.length,
      };
    });
  } else {
    const items = categories.flatMap((c) => c.items).filter((p) => inList(p, view));
    total = items.length;
    solved = items.filter((p) => p.done).length;
    label = ROADMAP_LABEL[view];
    bars = (["Easy", "Medium", "Hard"] as const).map((d) => {
      const di = items.filter((p) => p.diff === d);
      return {
        label: d,
        color: d === "Easy" ? "bg-sky" : d === "Medium" ? "bg-[#f5c26b]" : "bg-coral",
        done: di.filter((p) => p.done).length,
        total: di.length,
      };
    });
  }
  const pct = total ? Math.round((solved / total) * 100) : 0;

  return (
    <Card className="lg:col-span-1 h-full" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">My Progress</div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <select
            value={view}
            onChange={(e) => onBoard(e.target.value as View)}
            className="appearance-none rounded-full border border-border bg-transparent py-1 pl-3 pr-7 text-xs font-medium text-muted-foreground outline-none transition hover:bg-muted"
          >
            {ROADMAPS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
            {SD_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-[40px] leading-none tracking-tight">{solved}</div>
        <div className="text-sm text-muted-foreground">/ {total} {isSD ? "modules" : "solved"}</div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
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
