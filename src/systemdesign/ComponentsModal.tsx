import { Prose, Section, ServiceList, TermList, TopicReader } from "../components/Reader";
import { COMPONENT_DOCS } from "./components";
import { ComponentDiagram } from "./ComponentDiagrams";

export function ComponentsModal({ onClose }: { onClose: () => void }) {
  return (
    <TopicReader
      docs={COMPONENT_DOCS}
      crumb="Main components"
      navLabel={`Components · ${COMPONENT_DOCS.length}`}
      eyebrow={() => "System Design · Reference"}
      nextLabel="Next component"
      onClose={onClose}
    >
      {(doc) => (
        <>
          <figure className="m-0 rounded-xl border border-border bg-card p-5">
            <ComponentDiagram id={doc.id} />
          </figure>
          <Section label="The problem">
            <Prose paragraphs={doc.problem} />
          </Section>
          <Section label="How it works">
            <TermList items={doc.how} />
          </Section>
          <Section label="Common implementations">
            <ServiceList items={doc.implementations} />
          </Section>
        </>
      )}
    </TopicReader>
  );
}
