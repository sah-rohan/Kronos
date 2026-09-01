/**
 * `/u/:handle/activity` — one person's activity history, paginated via `?page=`.
 *
 * This is the half of the old `RecentActivityModal` that used to be the
 * "Friends" tab plus a friend picker. As a route the person is in the path, so
 * the picker disappears and each friend's history is its own linkable address.
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { NotFound } from "../app/NotFound";
import { FriendSolutionDialog } from "../overlays/SolutionDialog";
import { Pagination } from "../components/Pagination";
import { paginate } from "../lib/pagination";
import { diffStyles } from "../data/problems";
import { useData } from "../data/context";
import { fmtShortDate } from "../lib/date";
import { usePageParam } from "../lib/searchParams";
import { paths } from "../lib/slugs";
import type { ProblemRef } from "../types";

export function UserActivity() {
  const { handle } = useParams();
  const { recent, friends, members } = useData();
  const [page, setPage] = usePageParam();
  const [openProblem, setOpenProblem] = useState<ProblemRef | null>(null);

  const friend = friends.find((f) => f.username === handle || f.name === handle);
  const member = members.find((m) => m.username === handle || m.name === handle);

  if (!friend && !member) return <NotFound />;

  const displayName = friend?.name ?? member?.name ?? handle ?? "";
  const rows = recent.filter((r) => r.who.some((p) => p.name === displayName));
  const { items, pageCount, safePage } = paginate(rows, page);

  return (
    <>
      <PageHeader
        title={`${displayName}'s activity`}
        backTo={paths.user(handle ?? displayName)}
        backLabel={displayName}
        subtitle={
          rows.length > 0
            ? `${rows.length} solve${rows.length === 1 ? "" : "s"} this season.`
            : undefined
        }
      />

      <ul className="divide-y divide-border">
        {items.length === 0 && (
          <li className="py-6 text-sm text-muted-foreground">
            No recent solves from {displayName} yet.
          </li>
        )}
        {items.map((r) => (
          <li key={r.n} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
                #{r.n}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{r.name}</div>
                {r.at && <div className="text-xs text-muted-foreground">{fmtShortDate(r.at)}</div>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}
              >
                {r.diff}
              </span>
              {friend && (
                <button
                  onClick={() => setOpenProblem({ name: r.name, slug: r.slug, diff: r.diff })}
                  className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                >
                  Solutions
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Pagination page={safePage} pageCount={pageCount} onPage={setPage} total={rows.length} />

      {!friend && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add {displayName} as a friend to see their solutions.{" "}
          <Link to={paths.friends()} className="font-medium text-coral hover:underline">
            Manage friends
          </Link>
        </p>
      )}

      {openProblem && friend && (
        <FriendSolutionDialog
          friend={friend}
          problem={openProblem}
          recent
          onClose={() => setOpenProblem(null)}
        />
      )}
    </>
  );
}
