import { useState } from "react";
import { Article, NextLink, Prose, ReaderNav, ReaderNavItem, ReaderPage, Section, ServiceList, TermList } from "../components/Reader";
import { NETWORKING_DOCS } from "./networking";

export function NetworkingModal({ initialId, onClose }: { initialId?: string; onClose: () => void }) {
  const [index, setIndex] = useState(() => Math.max(0, NETWORKING_DOCS.findIndex((c) => c.id === initialId)));
  const active = NETWORKING_DOCS[index];
  const next = NETWORKING_DOCS[index + 1];

  return (
    <ReaderPage
      crumbs={["Study", "Networking", active.name]}
      onClose={onClose}
      scrollKey={active.id}
      aside={
        <ReaderNav label={`Networking · ${NETWORKING_DOCS.length} topics`}>
          {NETWORKING_DOCS.map((c, i) => (
            <ReaderNavItem key={c.id} index={i} active={i === index} onClick={() => setIndex(i)}>
              {c.name}
            </ReaderNavItem>
          ))}
        </ReaderNav>
      }
    >
      <Article eyebrow={`Topic ${String(index + 1).padStart(2, "0")} of ${NETWORKING_DOCS.length}`} title={active.name} tagline={active.tagline}>
        <Section label="What it is">
          <Prose paragraphs={active.what} />
        </Section>
        <Section label="How it works">
          <TermList items={active.how} />
        </Section>
        <Section label="In the cloud">
          <ServiceList items={active.cloud} />
        </Section>
        {next && (
          <footer className="flex justify-end border-t border-border pt-5">
            <NextLink label="Next topic" title={next.name} onClick={() => setIndex(index + 1)} />
          </footer>
        )}
      </Article>
    </ReaderPage>
  );
}
