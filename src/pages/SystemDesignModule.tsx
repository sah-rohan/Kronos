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
    <ErrorBoundary
      label="System Design module"
      // The canvas autosaves the in-progress design to this browser, so the
      // retry below really does come back with the user's components and wiring.
      hint="Your in-progress design is autosaved in this browser - try again and it comes back. If it keeps happening, reload the page."
    >
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
