import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { CurriculumCard, PREVIEW_COUNT } from "./CurriculumCard";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { paths } from "../lib/slugs";
import { GENAI_PROBLEMS } from "./genai";
import { completedSet } from "./progress";

export function GenAICard() {
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
    <CurriculumCard
      title="GenAI System Design"
      blurb="Design LLM and generative-AI systems, piece by piece."
      icon={Sparkles}
      total={GENAI_PROBLEMS.length}
      noun="modules"
      solvedCount={solvedCount}
      indexHref={paths.genai()}
      action="All modules"
      items={GENAI_PROBLEMS.slice(0, PREVIEW_COUNT).map((p) => ({
        slug: p.slug,
        title: p.title,
        detail: p.difficulty,
        href: paths.genaiModule(p.slug),
        done: solved.has(p.slug),
      }))}
    />
  );
}
