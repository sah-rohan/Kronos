import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { api } from "../lib/api";
import { GENAI_PROBLEMS } from "./genai";
import { completedSet } from "./progress";

export function GenAICard({ onOpen }: { onOpen: (slug: string) => void }) {
  const { getToken } = useData();
  const [solved, setSolved] = useState<Set<string>>(() => completedSet());

  useEffect(() => {
    api.sdSolved(getToken).then((s) => setSolved(new Set([...completedSet(), ...(s ?? [])]))).catch(() => {});
  }, [getToken]);

  const solvedCount = GENAI_PROBLEMS.filter((p) => solved.has(p.slug)).length;

  return (
    <Card className="lg:col-span-1 h-full">
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">GenAI System Design</div>
        <Sparkles className="h-4 w-4 text-coral" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Design LLM and generative-AI systems, piece by piece.
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{solvedCount}/{GENAI_PROBLEMS.length} solved</span>
        <span>{GENAI_PROBLEMS.length} modules</span>
      </div>
      <ul className="mt-3 h-72 space-y-2 overflow-y-auto pr-1">
        {GENAI_PROBLEMS.map((p) => {
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
