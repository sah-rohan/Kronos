import { Prose, Section, ServiceList, TermList, TopicReader } from "../components/Reader";
import { num } from "../lib/format";
import { NETWORKING_DOCS } from "./networking";

export function NetworkingModal({ initialId, onClose }: { initialId?: string; onClose: () => void }) {
  return (
    <TopicReader
      docs={NETWORKING_DOCS}
      initialId={initialId}
      crumb="Networking"
      navLabel={`Networking · ${NETWORKING_DOCS.length} topics`}
      eyebrow={(i) => `Topic ${num(i)} of ${NETWORKING_DOCS.length}`}
      numbered
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
          <Section label="In the cloud">
            <ServiceList items={doc.cloud} />
          </Section>
        </>
      )}
    </TopicReader>
  );
}
