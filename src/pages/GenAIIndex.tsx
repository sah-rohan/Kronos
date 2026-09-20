/** `/genai-system-design` — the GenAI module index. */
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { EntryPoint } from "../components/EntryPoint";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { paths } from "../lib/slugs";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import { completedSet } from "../systemdesign/progress";

export function GenAIIndex() {
  const { getToken } = useData();
  const [solved, setSolved] = useState<Set<string>>(() => completedSet());

  useEffect(() => {
    api
      .sdSolved(getToken)
      .then((s) => setSolved(new Set([...completedSet(), ...(s ?? [])])))
      .catch(() => {});
  }, [getToken]);

  const solvedCount = GENAI_PROBLEMS.filter((p) => solved.has(p.slug)).length;

  return (
    <>
      <PageHeader
        title="GenAI System Design"
        backTo={paths.dashboard()}
        backLabel="Dashboard"
        subtitle={`${solvedCount} of ${GENAI_PROBLEMS.length} modules complete — design LLM and generative-AI systems, piece by piece.`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GENAI_PROBLEMS.map((p) => (
          <EntryPoint
            key={p.slug}
            to={paths.genaiModule(p.slug)}
            action="Open"
            className="h-full"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-medium">{p.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{p.difficulty}</div>
              </div>
              {solved.has(p.slug) && (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3fae6a]/15 text-[#3fae6a]">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </EntryPoint>
        ))}
      </div>
    </>
  );
}
