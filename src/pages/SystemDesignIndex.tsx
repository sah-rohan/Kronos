/**
 * `/system-design` — the module index, plus the Main Components reference.
 *
 * Decision (recorded in docs/REVIEW.md): the components reference has
 * no route of its own because the Phase 1 route table does not define one.
 * It lives on the index and is addressed with `?topic=<slug>`, matching how
 * `/progress/:track` uses `?topic=`. Selecting a component replaces history
 * rather than pushing, so paging through the reference does not bury the back
 * button — it is a filter within a page, not a navigation.
 */
import { useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { EntryPoint } from "../components/EntryPoint";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { createSlugMap, paths } from "../lib/slugs";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { COMPONENT_DOCS } from "../systemdesign/components";
import { ComponentDiagram } from "../systemdesign/ComponentDiagrams";
import { completedSet } from "../systemdesign/progress";

const componentSlugs = createSlugMap(COMPONENT_DOCS.map((c) => c.id));

export function SystemDesignIndex() {
  const { getToken } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [solved, setSolved] = useState<Set<string>>(() => completedSet());

  useEffect(() => {
    api
      .sdSolved(getToken)
      .then((s) => setSolved(new Set([...completedSet(), ...(s ?? [])])))
      .catch(() => {});
  }, [getToken]);

  // `?topic=` selects the reference component; anything unknown coerces to the
  // first one rather than throwing.
  const requested = componentSlugs.toId(searchParams.get("topic") ?? undefined);
  const active =
    COMPONENT_DOCS.find((c) => c.id === requested) ?? COMPONENT_DOCS[0];

  const selectTopic = (id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("topic", componentSlugs.toSlug(id));
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  const solvedCount = SD_PROBLEMS.filter((p) => solved.has(p.slug)).length;

  return (
    <>
      <PageHeader
        title="System Design"
        backTo={paths.dashboard()}
        backLabel="Dashboard"
        subtitle={`${solvedCount} of ${SD_PROBLEMS.length} modules complete — learn each piece, then drag the design together.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SD_PROBLEMS.map((p) => (
          <EntryPoint
            key={p.slug}
            to={paths.systemDesignModule(p.slug)}
            action="Open"
            className="h-full"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-medium">{p.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{p.difficulty}</div>
              </div>
              {solved.has(p.slug) && (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3fae6a]/15 text-[#3fae6a]">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </EntryPoint>
        ))}
      </div>

      {/* ---- Main Components reference ------------------------------------ */}
      <section id="main-components" className="mt-10 scroll-mt-8">
        <h2 className="font-display text-2xl tracking-tight">Main Components</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The building blocks the modules draw from.
        </p>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row">
          <nav
            aria-label="Components"
            className="flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 lg:w-56 lg:flex-col lg:overflow-visible"
          >
            {COMPONENT_DOCS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-current={c.id === active.id ? "true" : undefined}
                onClick={() => selectTopic(c.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  c.id === active.id
                    ? "bg-coral text-coral-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.name}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="font-display text-2xl tracking-tight">{active.name}</div>
            <p className="mt-1 text-sm text-muted-foreground">{active.tagline}</p>

            <div className="mt-5 rounded-2xl border border-border bg-background/40 p-4">
              <ComponentDiagram id={active.id} />
            </div>

            <div className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              The problem
            </div>
            <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
              {active.problem.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              How it works
            </div>
            <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-muted-foreground">
              {active.how.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                  {typeof b === "string" ? (
                    <span>{b}</span>
                  ) : (
                    <span>
                      <span className="font-medium text-foreground">{b.term}.</span> {b.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Common implementations
            </div>
            <div className="mt-2 space-y-2">
              {active.implementations.map((impl) => (
                <div key={impl.name} className="rounded-2xl border border-border px-4 py-2.5">
                  <div className="text-sm font-medium">{impl.name}</div>
                  <div className="text-[13px] text-muted-foreground">{impl.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
