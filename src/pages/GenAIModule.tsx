/** `/genai-system-design/:moduleSlug` — same view as System Design, different catalog. */
import { useParams } from "react-router-dom";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { NotFound } from "../app/NotFound";
import { paths } from "../lib/slugs";
import { ModuleView } from "../systemdesign/ModuleView";
import { GENAI_PROBLEMS } from "../systemdesign/genai";

export function GenAIModule() {
  const { moduleSlug } = useParams();
  const problem = GENAI_PROBLEMS.find((p) => p.slug === moduleSlug);

  if (!problem) return <NotFound />;

  return (
    <ErrorBoundary label="GenAI System Design module">
      <ModuleView
        key={problem.slug}
        problem={problem}
        kicker="GenAI System Design"
        backTo={paths.genai()}
        backLabel="GenAI System Design"
      />
    </ErrorBoundary>
  );
}
