import { ChevronDown } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { ROADMAPS, inList } from "../lib/roadmaps";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import { useSdSolved } from "../systemdesign/progress";
import type { ProblemList } from "../types";

type View = ProblemList | "sd" | "genai";

const SD_OPTIONS: { key: View; label: string }[] = [
  { key: "sd", label: "System Design" },
  { key: "genai", label: "AI System Design" },
];

const DIFFS = [
  { label: "Easy", bar: "bg-easy" },
  { label: "Medium", bar: "bg-medium" },
  { label: "Hard", bar: "bg-hard" },
] as const;

const WEEKS = 12;
const SHADES = ["bg-muted", "bg-sky", "bg-easy", "bg-medium"];

function ActivityGrid({ byDate }: { byDate: Record<string, number> }) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - (WEEKS * 7 - 1 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, n: byDate[key] ?? 0, future: d > new Date() };
  });
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: "13px" }}>
      {days.map((d) => (
        <span
          key={d.key}
          title={d.future ? undefined : `${d.key}: ${d.n} solved`}
          className={`h-[13px] w-[13px] rounded-[3px] ${d.future ? "" : SHADES[Math.min(d.n, 3)]}`}
        />
      ))}
    </div>
  );
}

export function MyProgressCard({
  onOpen,
  board,
  onBoard,
}: {
  onOpen: () => void;
  board: View;
  onBoard: (b: View) => void;
}) {
  const { categories, calendar, getToken } = useData();
  const sdSolved = useSdSolved(getToken);
  const isSD = board === "sd" || board === "genai";

  const bars = DIFFS.map(({ label, bar }) => {
    if (isSD) {
      const di = (board === "genai" ? GENAI_PROBLEMS : SD_PROBLEMS).filter((p) => p.difficulty === label);
      return { label, bar, done: di.filter((p) => sdSolved.has(p.slug)).length, total: di.length };
    }
    const di = categories.flatMap((c) => c.items).filter((p) => inList(p, board) && p.diff === label);
    return { label, bar, done: di.filter((p) => p.done).length, total: di.length };
  });

  return (
    <Card className="flex h-full flex-col gap-5" onClick={onOpen}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 whitespace-nowrap font-display text-[26px] leading-tight">By difficulty</h2>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <select
            value={board}
            onChange={(e) => onBoard(e.target.value as View)}
            aria-label="Roadmap"
            className="appearance-none rounded-full border border-border bg-transparent py-1.5 pl-3 pr-7 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-muted"
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

      {bars.map((s) => (
        <div key={s.label} className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span>{s.label}</span>
            <span className="font-mono tabular-nums">
              {s.done} <span className="text-muted-foreground">/ {s.total}</span>
            </span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-sm bg-border">
            <div className={`h-full ${s.bar}`} style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}

      {!isSD && (
        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-[18px]">
          <span className="eyebrow">Last {WEEKS} weeks</span>
          <ActivityGrid byDate={calendar.byDate} />
        </div>
      )}
    </Card>
  );
}
