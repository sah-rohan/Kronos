import { Network } from "lucide-react";
import { CurriculumCard, PREVIEW_COUNT } from "./CurriculumCard";
import { paths, toSlug } from "../lib/slugs";
import { NETWORKING_DOCS } from "./networking";

export function NetworkingCard() {
  return (
    <CurriculumCard
      title="Networking"
      blurb="From packets to VPCs, security groups, and the edge."
      icon={Network}
      total={NETWORKING_DOCS.length}
      noun="topics"
      meta="Curriculum"
      indexHref={paths.networking()}
      action="All topics"
      // The curriculum is ordered, so preview rows keep their position numbers.
      numbered
      items={NETWORKING_DOCS.slice(0, PREVIEW_COUNT).map((c) => ({
        slug: c.id,
        title: c.name,
        detail: c.tagline,
        href: paths.networkingTopic(toSlug(c.id)),
      }))}
    />
  );
}
