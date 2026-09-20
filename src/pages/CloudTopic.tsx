import { NavLink, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { NotFound } from "../app/NotFound";
import { createSlugMap, paths } from "../lib/slugs";
import { CLOUD_DOCS } from "../systemdesign/cloud";

const slugs = createSlugMap(CLOUD_DOCS.map((c) => c.id));

export function CloudTopic() {
  const { topicSlug } = useParams();
  const id = slugs.toId(topicSlug);
  const active = CLOUD_DOCS.find((c) => c.id === id);

  if (!active) return <NotFound />;

  return (
    <>
      <PageHeader
        title={active.name}
        backTo={paths.cloud()}
        backLabel="Cloud Engineering"
        subtitle={active.tagline}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav
          aria-label="Cloud topics"
          className="flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 lg:w-56 lg:flex-col lg:overflow-visible"
        >
          {CLOUD_DOCS.map((c) => (
            <NavLink
              key={c.id}
              to={paths.cloudTopic(slugs.toSlug(c.id))}
              className={({ isActive }) =>
                `shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-coral text-coral-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`
              }
            >
              {c.name}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-6 sm:p-8">
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

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#ff9900]">
                On AWS
              </div>
              <div className="space-y-2">
                {active.aws.map((s) => (
                  <div key={s.name} className="rounded-2xl border border-border px-4 py-2.5">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[13px] text-muted-foreground">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#0078d4]">
                On Azure
              </div>
              <div className="space-y-2">
                {active.azure.map((s) => (
                  <div key={s.name} className="rounded-2xl border border-border px-4 py-2.5">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-[13px] text-muted-foreground">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
