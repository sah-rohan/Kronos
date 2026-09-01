/**
 * `/cloud` — the topic index.
 *
 * Migrated from `systemdesign/CloudModal.tsx`, which had no index at all: the
 * modal opened straight onto a topic with a sidebar. Splitting index from detail
 * is what makes a single topic linkable.
 */
import { Link } from "react-router-dom";
import { EntryPoint } from "../components/EntryPoint";
import { PageHeader } from "../components/PageHeader";
import { paths, toSlug } from "../lib/slugs";
import { CLOUD_DOCS } from "../systemdesign/cloud";

export function CloudIndex() {
  return (
    <>
      <PageHeader
        title="Cloud Engineering"
        backTo={paths.dashboard()}
        backLabel="Dashboard"
        subtitle="Core cloud building blocks, how they work, and the equivalent service on each cloud."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLOUD_DOCS.map((c) => (
          <EntryPoint
            key={c.id}
            to={paths.cloudTopic(toSlug(c.id))}
            action="Open"
            className="h-full"
          >
            <div className="text-[15px] font-medium">{c.name}</div>
            <p className="mt-1 text-xs text-muted-foreground">{c.tagline}</p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">{c.aws.length} AWS</span>
              <span className="rounded-full bg-muted px-2 py-0.5">{c.azure.length} Azure</span>
            </div>
          </EntryPoint>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Looking for the networking curriculum?{" "}
        <Link to={paths.networking()} className="font-medium text-coral hover:underline">
          Networking
        </Link>
      </p>
    </>
  );
}
