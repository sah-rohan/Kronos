/**
 * `/progress/:track` — the problem tracker.
 *
 * Migrated from `modals/ProgressModal.tsx`. Three things changed:
 *
 * 1. The track is a path segment, not `useState`. `/progress/blind75` is a real
 *    address, and switching track is a navigation (push), because it is a
 *    different screen's worth of content.
 * 2. Search, topic and status are search params via `useTrackFilters`, written
 *    with `replace` so typing in the search box does not fill up history.
 * 3. The solution viewer is still an overlay, but a focus-trapped one.
 *
 * An unknown `:track` renders not-found rather than silently falling back, so a
 * typo is visible instead of quietly showing the wrong list.
 */
import { useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ScoreRow } from "../components/ScoreCard";
import { OptimalTag } from "../components/OptimalTag";
import { NotFound } from "../app/NotFound";
import { MySolutionDialog } from "../overlays/SolutionDialog";
import { diffStyles, leetcodeUrl } from "../data/problems";
import { useData } from "../data/context";
import { useTrackFilters } from "../lib/searchParams";
import { ROADMAP_LABEL, inList } from "../lib/roadmaps";
import { TRACKS, isTrack, paths } from "../lib/slugs";
import type { ProblemRef } from "../types";

/** Category title -> stable kebab slug for `?topic=`. */
function topicSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProblemTracker() {
  const { track } = useParams();
  const { categories } = useData();
  const filters = useTrackFilters();
  const [openProblem, setOpenProblem] = useState<ProblemRef | null>(null);

  // Validated, not asserted. `isTrack` narrows `string | undefined` to `Track`.
  if (!isTrack(track)) return <NotFound />;

  const q = filters.query.trim().toLowerCase();

  const trackCats = categories
    .map((c) => ({ ...c, items: c.items.filter((p) => inList(p, track)) }))
    .filter((c) => c.items.length > 0);
  const trackAll = trackCats.flatMap((c) => c.items);
  const trackSolved = trackAll.filter((p) => p.done).length;

  const visible = trackCats
    .filter((c) => filters.topic === null || topicSlug(c.title) === filters.topic)
    .map((c) => ({
      ...c,
      items: c.items.filter((p) => {
        if (q && !p.name.toLowerCase().includes(q)) return false;
        if (filters.status === "solved" && !p.done) return false;
        if (filters.status === "unsolved" && p.done) return false;
        return true;
      }),
    }))
    .filter((c) => c.items.length > 0);

  const sorted = visible.map((c) => ({
    ...c,
    items:
      filters.sort === "title"
        ? [...c.items].sort((a, b) => a.name.localeCompare(b.name))
        : filters.sort === "difficulty"
          ? [...c.items].sort(
              (a, b) =>
                ["Easy", "Medium", "Hard"].indexOf(a.diff) -
                ["Easy", "Medium", "Hard"].indexOf(b.diff),
            )
          : c.items,
  }));

  return (
    <>
      <PageHeader
        title="My Progress"
        backTo={paths.dashboard()}
        backLabel="Dashboard"
        subtitle={
          <>
            <b className="text-foreground">
              {trackSolved} of {trackAll.length}
            </b>{" "}
            solved on {ROADMAP_LABEL[track]}. Open a solved problem to see your solution.
          </>
        }
      />

      {/* Track switcher — a navigation, so these are links and they push. */}
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-background/60 p-1">
        {TRACKS.map((t) => (
          <Link
            key={t}
            to={paths.progress(t)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-center text-xs font-medium transition ${
              t === track
                ? "bg-coral text-coral-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {ROADMAP_LABEL[t]}
          </Link>
        ))}
      </div>

      {/* Filters — search params, written with replace. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.query}
            onChange={(e) => filters.setQuery(e.target.value)}
            placeholder="Search problems…"
            aria-label="Search problems"
            className="w-full rounded-xl border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-coral"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => filters.setStatus(e.target.value as typeof filters.status)}
          aria-label="Filter by status"
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
        >
          <option value="all">All</option>
          <option value="solved">Solved</option>
          <option value="unsolved">Unsolved</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => filters.setSort(e.target.value as typeof filters.sort)}
          aria-label="Sort problems"
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
        >
          <option value="catalog">Catalog order</option>
          <option value="title">Title</option>
          <option value="difficulty">Difficulty</option>
        </select>

        <select
          value={filters.topic ?? ""}
          onChange={(e) => filters.setTopic(e.target.value || null)}
          aria-label="Filter by topic"
          className="max-w-[200px] rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none"
        >
          <option value="">All topics</option>
          {trackCats.map((c) => (
            <option key={c.title} value={topicSlug(c.title)}>
              {c.title}
            </option>
          ))}
        </select>

        {filters.isFiltered && (
          <button
            onClick={filters.clear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {trackAll.length === 0 ? (
          <p className="text-sm text-muted-foreground">This list isn&apos;t set up yet.</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No problems match the current filters.{" "}
            <button onClick={filters.clear} className="font-medium text-coral hover:underline">
              Clear them
            </button>
            .
          </p>
        ) : null}

        {sorted.map((c) => {
          const done = c.items.filter((p) => p.done).length;
          return (
            <div key={c.title}>
              {/*
                Score-first per-topic summary (Phase 4): the number the reader
                came for is first and largest, the topic name is the qualifier.
              */}
              <ScoreRow value={done} total={c.items.length} label={c.title} />
              <ul className="mt-2 space-y-1">
                {c.items.map((p) => (
                  <li
                    key={p.name}
                    className="flex flex-col gap-2 rounded-xl px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                          p.done ? "bg-coral text-white" : "border border-border text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          p.done ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {p.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                      <a
                        href={leetcodeUrl(p.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
                        title="Open on LeetCode"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {p.done && (
                        <button
                          onClick={() =>
                            setOpenProblem({ name: p.name, slug: p.slug, diff: p.diff })
                          }
                          className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                        >
                          Solutions
                        </button>
                      )}
                      {p.done && p.optimal && <OptimalTag />}
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${diffStyles[p.diff]}`}
                      >
                        {p.diff}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {openProblem && (
        <MySolutionDialog problem={openProblem} onClose={() => setOpenProblem(null)} />
      )}
    </>
  );
}
