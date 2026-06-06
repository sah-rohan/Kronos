import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { langStyles } from "../data/friends";
import type { Solution } from "../types";

export function SolutionSlider({ solutions }: { solutions: Solution[] }) {
  const [index, setIndex] = useState(0);
  const s = solutions[index];
  if (!s) {
    return <p className="mt-5 text-sm text-muted-foreground">No solutions yet.</p>;
  }
  return (
    <div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${langStyles[s.lang]}`}>
            {s.lang}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {s.runtimeMs} ms · beats {s.runtimePct}%
          </span>
          {s.optimal && (
            <span className="rounded-full bg-[#d5f0db] px-2.5 py-1 text-[11px] font-medium text-[#2f7d46]">
              Optimal
            </span>
          )}
        </div>
        {solutions.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex((index - 1 + solutions.length) % solutions.length)}
              className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {index + 1} / {solutions.length}
            </span>
            <button
              onClick={() => setIndex((index + 1) % solutions.length)}
              className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <pre className="modal-scroll mt-4 max-h-[55vh] overflow-auto rounded-xl bg-foreground/[0.04] p-4 text-[12px] leading-relaxed text-foreground dark:bg-white/[0.04]">
        <code>{s.code}</code>
      </pre>
    </div>
  );
}
