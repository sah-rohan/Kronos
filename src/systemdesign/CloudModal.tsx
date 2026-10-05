import { useState } from "react";
import { Article, NextLink, Prose, ReaderNav, ReaderNavItem, ReaderPage, Section, ServiceList, TermList } from "../components/Reader";
import { CLOUD_DOCS } from "./cloud";

export function CloudModal({ initialId, onClose }: { initialId?: string; onClose: () => void }) {
  const [index, setIndex] = useState(() => Math.max(0, CLOUD_DOCS.findIndex((c) => c.id === initialId)));
  const active = CLOUD_DOCS[index];
  const next = CLOUD_DOCS[index + 1];

  return (
    <ReaderPage
      crumbs={["Study", "Cloud", active.name]}
      onClose={onClose}
      scrollKey={active.id}
      aside={
        <ReaderNav label={`Cloud · ${CLOUD_DOCS.length} topics`}>
          {CLOUD_DOCS.map((c, i) => (
            <ReaderNavItem key={c.id} active={i === index} onClick={() => setIndex(i)}>
              {c.name}
            </ReaderNavItem>
          ))}
        </ReaderNav>
      }
    >
      <Article eyebrow={`Topic ${String(index + 1).padStart(2, "0")} · AWS & Azure`} title={active.name} tagline={active.tagline}>
        <Section label="What it is">
          <Prose paragraphs={active.what} />
        </Section>
        <Section label="How it works">
          <TermList items={active.how} />
        </Section>
        <Section label="On each cloud">
          <div className="grid gap-8 sm:grid-cols-2">
            <ServiceList title="AWS" items={active.aws} />
            <ServiceList title="Azure" items={active.azure} />
          </div>
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
