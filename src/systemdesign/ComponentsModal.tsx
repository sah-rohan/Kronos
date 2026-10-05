import { useState } from "react";
import { Article, NextLink, Prose, ReaderNav, ReaderNavItem, ReaderPage, Section, ServiceList, TermList } from "../components/Reader";
import { COMPONENT_DOCS } from "./components";
import { ComponentDiagram } from "./ComponentDiagrams";

export function ComponentsModal({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const active = COMPONENT_DOCS[index];
  const next = COMPONENT_DOCS[index + 1];

  return (
    <ReaderPage
      crumbs={["Study", "Main components", active.name]}
      onClose={onClose}
      scrollKey={active.id}
      aside={
        <ReaderNav label={`Components · ${COMPONENT_DOCS.length}`}>
          {COMPONENT_DOCS.map((c, i) => (
            <ReaderNavItem key={c.id} active={i === index} onClick={() => setIndex(i)}>
              {c.name}
            </ReaderNavItem>
          ))}
        </ReaderNav>
      }
    >
      <Article eyebrow="System Design · Reference" title={active.name} tagline={active.tagline}>
        <figure className="m-0 rounded-xl border border-border bg-card p-5">
          <ComponentDiagram id={active.id} />
        </figure>
        <Section label="The problem">
          <Prose paragraphs={active.problem} />
        </Section>
        <Section label="How it works">
          <TermList items={active.how} />
        </Section>
        <Section label="Common implementations">
          <ServiceList items={active.implementations} />
        </Section>
        {next && (
          <footer className="flex justify-end border-t border-border pt-5">
            <NextLink label="Next component" title={next.name} onClick={() => setIndex(index + 1)} />
          </footer>
        )}
      </Article>
    </ReaderPage>
  );
}
