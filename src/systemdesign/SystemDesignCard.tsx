import { useEffect, useState } from "react";
import { BookOpen, Network } from "lucide-react";
import { Link } from "react-router-dom";
import { ABOVE_STRETCH } from "../components/EntryPoint";
import { CurriculumCard, PREVIEW_COUNT } from "./CurriculumCard";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { paths } from "../lib/slugs";
import { SD_PROBLEMS } from "./problems";
import { completedSet } from "./progress";

export function SystemDesignCard() {
  const { getToken } = useData();
  // Start from the local optimistic set, then reconcile with the DB.
  const [solved, setSolved] = useState<Set<string>>(() => completedSet());

  useEffect(() => {
    api
      .sdSolved(getToken)
      .then((s) => setSolved(new Set([...completedSet(), ...(s ?? [])])))
      .catch(() => {});
  }, [getToken]);

  const solvedCount = SD_PROBLEMS.filter((p) => solved.has(p.slug)).length;

  return (
    <CurriculumCard
      title="System Design"
      blurb="Learn each piece, then drag the design together."
      icon={Network}
      total={SD_PROBLEMS.length}
      noun="modules"
      solvedCount={solvedCount}
      indexHref={paths.systemDesign()}
      action="All modules"
      items={SD_PROBLEMS.slice(0, PREVIEW_COUNT).map((p) => ({
        slug: p.slug,
        title: p.title,
        detail: p.difficulty,
        href: paths.systemDesignModule(p.slug),
        done: solved.has(p.slug),
      }))}
    >
      <Link
        to={paths.systemDesignComponents()}
        className={`${ABOVE_STRETCH} mt-3 flex w-full items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-left text-sm font-medium transition hover:border-coral/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
      >
        <BookOpen className="h-4 w-4 shrink-0 text-coral" />
        Main Components
        <span className="ml-auto text-[11px] text-muted-foreground">reference</span>
      </Link>
    </CurriculumCard>
  );
}
