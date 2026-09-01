/**
 * `/system-design/:moduleSlug`
 *
 * The slug is validated against the module list; an unknown one renders the
 * not-found screen. The old code guarded this by rendering nothing, which meant
 * a stale activity row silently did nothing when clicked.
 */
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
    // Key by slug so moving between modules remounts the view with fresh canvas
    // state — reused state from another module's palette used to crash the
    // renderer, which is why the ErrorBoundary is here too.
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
