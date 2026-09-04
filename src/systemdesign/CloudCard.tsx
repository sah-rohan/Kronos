import { Cloud } from "lucide-react";
import { CurriculumCard, PREVIEW_COUNT } from "./CurriculumCard";
import { paths, toSlug } from "../lib/slugs";
import { CLOUD_DOCS } from "./cloud";

export function CloudCard() {
  return (
    <CurriculumCard
      title="Cloud Engineering"
      blurb="Learn AWS and Azure, side by side, in depth."
      icon={Cloud}
      total={CLOUD_DOCS.length}
      noun="topics"
      meta="AWS + Azure"
      indexHref={paths.cloud()}
      action="All topics"
      items={CLOUD_DOCS.slice(0, PREVIEW_COUNT).map((c) => ({
        slug: c.id,
        title: c.name,
        detail: c.tagline,
        // Cloud ids are snake_case internally; toSlug renders them as kebab.
        href: paths.cloudTopic(toSlug(c.id)),
      }))}
    />
  );
}
