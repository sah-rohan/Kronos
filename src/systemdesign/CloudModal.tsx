import { Prose, Section, ServiceList, TermList, TopicReader } from "../components/Reader";
import { num } from "../lib/format";
import { CLOUD_DOCS } from "./cloud";

export function CloudModal({ initialId, onClose }: { initialId?: string; onClose: () => void }) {
  return (
    <TopicReader
      docs={CLOUD_DOCS}
      initialId={initialId}
      crumb="Cloud"
      navLabel={`Cloud · ${CLOUD_DOCS.length} topics`}
      eyebrow={(i) => `Topic ${num(i)} · AWS & Azure`}
      onClose={onClose}
    >
      {(doc) => (
        <>
          <Section label="What it is">
            <Prose paragraphs={doc.what} />
          </Section>
          <Section label="How it works">
            <TermList items={doc.how} />
          </Section>
          <Section label="On each cloud">
            <div className="grid gap-8 sm:grid-cols-2">
              <ServiceList title="AWS" items={doc.aws} />
              <ServiceList title="Azure" items={doc.azure} />
            </div>
          </Section>
        </>
      )}
    </TopicReader>
  );
}
