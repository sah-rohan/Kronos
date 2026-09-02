import { useParams } from "react-router-dom";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { NotFound } from "../app/NotFound";
import { paths } from "../lib/slugs";
import { ModuleView } from "../systemdesign/ModuleView";
import { SD_PROBLEMS } from "../systemdesign/problems";

export function SystemDesignModule() {
  const { moduleSlug } = useParams();
  const problem = SD_PROBLEMS.find((p) => p.slug === moduleSlug);

  if (!problem) return <NotFound />;

  return (
    // Key by slug so moving between modules remounts the view with fresh canvas state
    <ErrorBoundary label="System Design module">
      <ModuleView
        key={problem.slug}
        problem={problem}
        kicker="System Design"
        backTo={paths.systemDesign()}
        backLabel="System Design"
      />
    </ErrorBoundary>
  );
}
