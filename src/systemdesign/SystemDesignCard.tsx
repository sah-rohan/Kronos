import { useEffect, useState } from "react";
import { BookOpen, Check, Network } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { api } from "../lib/api";
import { SD_PROBLEMS } from "./problems";
import { completedSet } from "./progress";

export function SystemDesignCard({
  onOpen,
  onOpenComponents,
}: {
  onOpen: (slug: string) => void;
  onOpenComponents: () => void;
}) {
  const { getToken } = useData();
  // Start from the local optimistic set, then reconcile with the DB.
  const [solved, setSolved] = useState<Set<string>>(() => completedSet());

  useEffect(() => {
    api.sdSolved(getToken).then((s) => setSolved(new Set([...completedSet(), ...(s ?? [])]))).catch(() => {});
  }, [getToken]);

  const solvedCount = SD_PROBLEMS.filter((p) => solved.has(p.slug)).length;

  return (
    <Card className="lg:col-span-1 h-full" onClick={(e) => { 
          if ((e.target as HTMLElement).closest("ul")) return; // the click came from inside the topic list, so let the row's own button handle it. Also catches scrollbar drags, which target the <ul>
          onOpen(SD_PROBLEMS[0].slug) // otherwise, open the module at SD_PROBLEMS[0].slug
        }}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">System Design</div>
        <Network className="h-4 w-4 text-coral" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Learn each piece, then drag the design together.
      </p>

      <button
        onClick={onOpenComponents}
        className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-left text-sm font-medium transition cursor-pointer hover:bg-muted"
      >
        <BookOpen className="h-4 w-4 shrink-0 text-coral" />
        Main components
        <span className="ml-auto text-[11px] text-muted-foreground">reference</span>
      </button>

      <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{solvedCount}/{SD_PROBLEMS.length} solved</span>
        <span>{SD_PROBLEMS.length} modules</span>
      </div>
      <ul className="mt-3 h-60 space-y-2 overflow-y-auto pr-1">
        {SD_PROBLEMS.map((p) => {
          const done = solved.has(p.slug);
          return (
            <li key={p.slug}>
              <button
                onClick={() => onOpen(p.slug)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition cursor-pointer hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground">{p.difficulty}</div>
                </div>
                {done && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3fae6a]/15 text-[#3fae6a]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
