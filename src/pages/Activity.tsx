import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { AvatarStack } from "../components/AvatarStack";
import { MySolutionDialog } from "../overlays/SolutionDialog";
import { diffStyles } from "../data/problems";
import { useData } from "../data/context";
import { fmtShortDate } from "../lib/date";
import { usePageParam } from "../lib/searchParams";
import { paths } from "../lib/slugs";
import { useShell } from "../app/shell";
import { Pagination } from "../components/Pagination";
import { paginate } from "../lib/pagination";
import type { ProblemRef } from "../types";

export function Activity() {
  const { recent, friends } = useData();
  const { userName } = useShell();
  const [page, setPage] = usePageParam();
  const [openProblem, setOpenProblem] = useState<ProblemRef | null>(null);

  const rows = recent.filter((r) => r.who.some((p) => p.name === userName));
  const { items, pageCount, safePage } = paginate(rows, page);

  return (
    <>
      <PageHeader
        title="Your activity"
        backTo={paths.dashboard()}
        backLabel="Dashboard"
        subtitle={
          rows.length > 0
            ? `${rows.length} solve${rows.length === 1 ? "" : "s"} this season. Open a row to see your solution.`
            : "No solves yet this season."
        }
      />

      <ul className="divide-y divide-border">
        {items.length === 0 && (
          <li className="py-6 text-sm text-muted-foreground">No solves yet this season.</li>
        )}
        {items.map((r) => {
          const who = r.who.filter((p) => p.name !== userName);
          return (
            <li key={r.n} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
                  #{r.n}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{r.name}</div>
                  {r.at && (
                    <div className="text-xs text-muted-foreground">{fmtShortDate(r.at)}</div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}
                >
                  {r.diff}
                </span>
                {who.length > 0 && <AvatarStack who={who} cap={3} />}
                <button
                  onClick={() =>
                    setOpenProblem({ name: r.name, slug: r.slug, diff: r.diff })
                  }
                  className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                >
                  Solutions
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Pagination page={safePage} pageCount={pageCount} onPage={setPage} total={rows.length} />

      {friends.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[15px] font-medium">Friends&apos; activity</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {friends.map((f) => (
              <Link
                key={f.id}
                to={paths.userActivity(f.username || f.name)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-medium ${f.color}`}
                >
                  {f.initials}
                </span>
                {f.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {openProblem && (
        <MySolutionDialog
          problem={openProblem}
          recent
          label="Your recent solutions"
          onClose={() => setOpenProblem(null)}
        />
      )}
    </>
  );
}
