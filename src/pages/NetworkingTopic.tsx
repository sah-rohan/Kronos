import { Link, NavLink, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { NotFound } from "../app/NotFound";
import { createSlugMap, paths } from "../lib/slugs";
import { NETWORKING_DOCS } from "../systemdesign/networking";

const slugs = createSlugMap(NETWORKING_DOCS.map((c) => c.id));

export function NetworkingTopic() {
  const { topicSlug } = useParams();
  const id = slugs.toId(topicSlug);
  const index = NETWORKING_DOCS.findIndex((c) => c.id === id);
  const active = index >= 0 ? NETWORKING_DOCS[index] : undefined;

  if (!active) return <NotFound />;

  const prev = index > 0 ? NETWORKING_DOCS[index - 1] : null;
  const next =
    index < NETWORKING_DOCS.length - 1 ? NETWORKING_DOCS[index + 1] : null;

  return (
    <>
      <PageHeader
        title={active.name}
        backTo={paths.networking()}
        backLabel="Networking"
        subtitle={active.tagline}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          aria-label="Networking topics"
          className="flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 lg:w-60 lg:flex-col lg:overflow-visible"
        >
          {NETWORKING_DOCS.map((c, i) => (
            <NavLink
              key={c.id}
              to={paths.networkingTopic(slugs.toSlug(c.id))}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-coral text-coral-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`
              }
            >
              <span className="text-[11px] tabular-nums opacity-70">{i + 1}</span>
              {c.name}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What it is
            </div>
            <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
              {active.what.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              How it works
            </div>
            <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-muted-foreground">
              {active.how.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                  <span>
                    <span className="font-medium text-foreground">{h.term}.</span> {h.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              In the cloud
            </div>
            <div className="mt-2 space-y-2">
              {active.cloud.map((s) => (
                <div key={s.name} className="rounded-2xl border border-border px-4 py-2.5">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[13px] text-muted-foreground">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {prev ? (
              <Link
                to={paths.networkingTopic(slugs.toSlug(prev.id))}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
                {prev.name}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                to={paths.networkingTopic(slugs.toSlug(next.id))}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                {next.name}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
