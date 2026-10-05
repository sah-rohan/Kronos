import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { IconButton } from "./Modal";
import { useEscape } from "../lib/useEscape";
import { num } from "../lib/format";

export function ReaderPage({
  crumbs,
  onClose,
  aside,
  status,
  scrollKey,
  children,
}: {
  crumbs: string[];
  onClose: () => void;
  aside?: ReactNode;
  status?: ReactNode;
  scrollKey?: string | number;
  children: ReactNode;
}) {
  useEscape(onClose);
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);
  return (
    <div role="dialog" aria-modal="true" aria-label={crumbs[crumbs.length - 1]} className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-8">
        <IconButton label={`Back to ${crumbs[0]}`} onClick={onClose}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={c + i} className={`flex items-center gap-2 ${i === crumbs.length - 1 ? "text-foreground" : ""}`}>
              {i > 0 && <span aria-hidden>/</span>}
              {i === 0 ? (
                <button type="button" onClick={onClose} className="hover:text-foreground">
                  {c}
                </button>
              ) : (
                c
              )}
            </span>
          ))}
        </nav>
        {status && <div className="ml-auto flex items-center gap-4">{status}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {aside}
        <main ref={mainRef} className="modal-scroll min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function ReaderNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav
      aria-label={label}
      className="modal-scroll flex shrink-0 gap-0.5 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 lg:w-[260px] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-4 lg:py-7"
    >
      <span className="eyebrow hidden px-3 pb-2.5 lg:block">{label}</span>
      {children}
    </nav>
  );
}

export function ReaderNavItem({
  active,
  done,
  disabled,
  index,
  onClick,
  children,
}: {
  active: boolean;
  done?: boolean;
  disabled?: boolean;
  index?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "step" : undefined}
      className={`flex min-h-10 shrink-0 items-baseline gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-default disabled:opacity-45 ${
        active ? "bg-muted font-medium text-foreground" : done ? "text-foreground hover:bg-muted" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {index !== undefined && (
        <span className={`font-mono text-xs ${done ? "text-accent" : "text-muted-foreground"}`}>{num(index)}</span>
      )}
      <span className="whitespace-nowrap lg:whitespace-normal">{children}</span>
    </button>
  );
}

export function TermList({ items }: { items: (string | { term: string; text: string })[] }) {
  return (
    <dl className="m-0 border-b border-border">
      {items.map((it, i) =>
        typeof it === "string" ? (
          <div key={i} className="border-t border-border py-4 text-[15px] leading-relaxed text-muted-foreground">
            {it}
          </div>
        ) : (
          <div key={it.term} className="grid gap-1 border-t border-border py-4 sm:grid-cols-[minmax(140px,200px)_1fr] sm:gap-6">
            <dt className="font-display text-[19px] leading-snug">{it.term}</dt>
            <dd className="m-0 text-[15px] leading-relaxed text-muted-foreground">{it.text}</dd>
          </div>
        ),
      )}
    </dl>
  );
}

export function ServiceList({ title, items }: { title?: string; items: { name: string; desc: string }[] }) {
  return (
    <div className="flex flex-col">
      {title && <span className="eyebrow border-b border-foreground pb-2.5">{title}</span>}
      <ul className="m-0 list-none border-b border-border p-0">
        {items.map((s) => (
          <li key={s.name} className="border-t border-border py-3.5 first:border-t-0">
            <div className="text-[15px] font-medium">{s.name}</div>
            <div className="text-sm text-muted-foreground">{s.desc}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="eyebrow m-0">{label}</h2>
      {children}
    </section>
  );
}

export function NextLink({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 flex-col items-end gap-1 text-right">
      <span className="eyebrow">{label}</span>
      <span className="font-display text-xl hover:text-accent">{title} →</span>
    </button>
  );
}

export function Article({ eyebrow, title, tagline, children }: { eyebrow: string; title: string; tagline: string; children: ReactNode }) {
  return (
    <article className="mx-auto flex max-w-[720px] flex-col gap-10 px-5 py-10 sm:px-10 sm:py-14">
      <header className="flex flex-col gap-3.5">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="m-0 font-display text-[clamp(36px,5vw,56px)] font-light leading-[1.04] tracking-[-0.02em]">{title}</h1>
        <p className="m-0 font-display text-[20px] leading-snug text-muted-foreground sm:text-[22px]">{tagline}</p>
      </header>
      {children}
    </article>
  );
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {paragraphs.map((p, i) => (
        <p key={i} className={`m-0 text-[17px] leading-[1.65] ${i > 0 ? "text-muted-foreground" : ""}`}>
          {p}
        </p>
      ))}
    </div>
  );
}

// A full-page reader over a list of topics: a rail to jump between them, one
// article per topic, and a "next" link at the bottom of each.
export function TopicReader<T extends { id: string; name: string; tagline: string }>({
  docs,
  initialId,
  crumb,
  navLabel,
  eyebrow,
  numbered = false,
  nextLabel = "Next topic",
  onClose,
  children,
}: {
  docs: T[];
  initialId?: string;
  crumb: string;
  navLabel: string;
  eyebrow: (index: number) => string;
  numbered?: boolean;
  nextLabel?: string;
  onClose: () => void;
  children: (doc: T) => ReactNode;
}) {
  const [index, setIndex] = useState(() => Math.max(0, docs.findIndex((d) => d.id === initialId)));
  const active = docs[index];
  const next = docs[index + 1];
  return (
    <ReaderPage
      crumbs={["Study", crumb, active.name]}
      onClose={onClose}
      scrollKey={active.id}
      aside={
        <ReaderNav label={navLabel}>
          {docs.map((d, i) => (
            <ReaderNavItem key={d.id} index={numbered ? i : undefined} active={i === index} onClick={() => setIndex(i)}>
              {d.name}
            </ReaderNavItem>
          ))}
        </ReaderNav>
      }
    >
      <Article eyebrow={eyebrow(index)} title={active.name} tagline={active.tagline}>
        {children(active)}
        {next && (
          <footer className="flex justify-end border-t border-border pt-5">
            <NextLink label={nextLabel} title={next.name} onClick={() => setIndex(index + 1)} />
          </footer>
        )}
      </Article>
    </ReaderPage>
  );
}
