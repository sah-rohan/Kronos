import { EntryPoint } from "../components/EntryPoint";
import { PageHeader } from "../components/PageHeader";
import { paths, toSlug } from "../lib/slugs";
import { NETWORKING_DOCS } from "../systemdesign/networking";

export function NetworkingIndex() {
  return (
    <>
      <PageHeader
        title="Networking"
        backTo={paths.dashboard()}
        backLabel="Dashboard"
        subtitle="From packets to VPCs, security groups, and the edge — in order."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NETWORKING_DOCS.map((c, i) => (
          <EntryPoint
            key={c.id}
            to={paths.networkingTopic(toSlug(c.id))}
            action="Open"
            className="h-full"
          >
            <div className="flex items-baseline gap-2.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] font-medium">{c.name}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.tagline}</p>
          </EntryPoint>
        ))}
      </div>
    </>
  );
}
