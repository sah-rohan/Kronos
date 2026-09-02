import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Flame, Search, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { OptimalTag } from "../components/OptimalTag";
import { ScoreCard, ScoreRow } from "../components/ScoreCard";
import { DifficultyBars } from "../components/DifficultyBars";
import { NotFound } from "../app/NotFound";
import { FriendSolutionDialog } from "../overlays/SolutionDialog";
import { diffStyles, leetcodeUrl } from "../data/problems";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { maxWeighted, rankFor } from "../lib/rank";
import { paths } from "../lib/slugs";
import { useTrackFilters } from "../lib/searchParams";
import { fmtShortDate } from "../lib/date";
import { streakKeys, useToday } from "../lib/calendar";
import { comparisonNote, solvedInWindow, streakLabel, weeklyDelta } from "../lib/momentum";
import {
  countSolvedByDifficulty,
  memberCounts,
  totalCounts,
  ZERO_COUNTS,
} from "../lib/difficultyCounts";
import { ROADMAPS, ROADMAP_LABEL, inList } from "../lib/roadmaps";
import type { Friend, ProblemRef } from "../types";

type Item = { name: string; slug: string; diff: string; done: boolean; optimal: boolean };
type Cat = { title: string; items: Item[] };

export function UserProfile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { members, friends, categories, recent, removeFriend, getToken } = useData();
  const { query, setQuery } = useTrackFilters();
  const today = useToday();

  const [loaded, setLoaded] = useState<{ id: string; cats: Cat[] } | null>(null);
  const [theirDays, setTheirDays] = useState<{
    id: string;
    byDate: Record<string, number>;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [openProblem, setOpenProblem] = useState<ProblemRef | null>(null);

  const friend: Friend | undefined = friends.find(
    (f) => f.username === handle || f.name === handle,
  );
  const member = members.find((m) => m.username === handle || m.name === handle);
  const friendId = friend?.id;

  useEffect(() => {
    if (!friendId) return;
    let cancelled = false;
    api
      .friendProgress(getToken, friendId)
      .then((rows) => {
        if (cancelled) return;
        const order: string[] = [];
        const map = new Map<string, Item[]>();
        for (const r of rows ?? []) {
          if (!r.blind75 && !r.neetcode150 && !r.neetcode250) continue;
          if (!map.has(r.category)) {
            map.set(r.category, []);
            order.push(r.category);
          }
          map.get(r.category)!.push({
            name: r.title,
            slug: r.slug,
            diff: r.difficulty,
            done: r.done,
            optimal: r.optimal,
          });
        }
        setLoaded({
          id: friendId,
          cats: order.map((t) => ({ title: t, items: map.get(t)! })),
        });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id: friendId, cats: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [friendId, getToken]);

  // Their calendar, so their streak is computed by the same code as ours.
  useEffect(() => {
    if (!friendId) return;
    let cancelled = false;
    api
      .friendCalendar(getToken, friendId)
      .then((days) => {
        if (cancelled) return;
        const byDate: Record<string, number> = {};
        for (const d of days ?? []) byDate[d.date] = d.count;
        setTheirDays({ id: friendId, byDate });
      })
      .catch(() => {
        if (!cancelled) setTheirDays({ id: friendId, byDate: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [friendId, getToken]);

  const displayName = friend?.name ?? member?.name ?? handle ?? "";

  const theirWeek = useMemo(
    () => weeklyDelta(solvedInWindow(recent, displayName, today.key)),
    [recent, displayName, today.key],
  );
  const myCounts = useMemo(() => countSolvedByDifficulty(categories), [categories]);
  const theirCounts = useMemo(
    () => (member ? memberCounts(member) : { ...ZERO_COUNTS }),
    [member],
  );
  const theirActivity = useMemo(
    () => recent.filter((r) => r.who.some((p) => p.name === displayName)).slice(0, 8),
    [recent, displayName],
  );

  const theirStreak =
    theirDays && theirDays.id === friendId
      ? streakKeys(theirDays.byDate, today.key).size
      : null;

  // Neither a friend nor a leaderboard member: not a real person here.
  if (!friend && !member) return <NotFound />;

  const cats = loaded && loaded.id === friendId ? loaded.cats : [];
  const q = query.trim().toLowerCase();
  const all = cats.flatMap((c) => c.items);
  const solvedCount = all.filter((p) => p.done).length;

  const filtered = cats
    .map((c) => ({
      ...c,
      items: q ? c.items.filter((p) => p.name.toLowerCase().includes(q)) : c.items,
    }))
    .filter((c) => c.items.length > 0);

  const maxW = maxWeighted(categories);
  const tier = member
    ? rankFor(member.byDiff.easy, member.byDiff.medium, member.byDiff.hard, maxW)
    : null;

  const theirTotal = totalCounts(theirCounts);
  const myTotal = totalCounts(myCounts);
  const initials =
    friend?.initials ?? member?.initials ?? displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader
        title={displayName}
        backTo={paths.leaderboard()}
        backLabel="Leaderboard"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {handle && <span>@{handle}</span>}
            {tier && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tier.badge}`}
              >
                {tier.tier}
              </span>
            )}
          </span>
        }
        actions={
          <Link
            to={paths.userActivity(handle ?? displayName)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            Full activity
          </Link>
        }
      />

      {/* ---- Header: avatar plus the numbers you came for, score-first ------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex h-full flex-col items-start justify-center rounded-2xl border border-border bg-card p-5">
          <div
            className={`grid h-16 w-16 place-items-center rounded-full text-lg font-medium ${
              friend?.color ?? member?.color ?? "bg-muted"
            }`}
          >
            {initials}
          </div>
          <div className="mt-3 text-[15px] font-medium">{displayName}</div>
          {handle && <div className="text-xs text-muted-foreground">@{handle}</div>}
        </div>

        <ScoreCard
          value={theirTotal}
          label="solved"
          qualifier="All difficulties"
          momentum={theirWeek}
          emphasis="hero"
        />

        {theirStreak !== null ? (
          <ScoreCard
            value={
              <span className="inline-flex items-baseline gap-2">
                <Flame className="h-6 w-6 self-center text-coral" />
                {theirStreak}
              </span>
            }
            label="day streak"
            qualifier={streakLabel(theirStreak)}
          />
        ) : (
          <ScoreCard
            value="—"
            label="day streak"
            qualifier={
              friend ? "Loading their calendar…" : "Streaks are shared between friends"
            }
            to={friend ? undefined : paths.friends()}
            action={friend ? undefined : "Add friend"}
          />
        )}

        <ScoreCard
          value={theirWeek.count}
          label="this week"
          qualifier="Solves in the last 7 days"
          momentum={theirWeek}
        />
      </div>

      {member && (
        <section className="mt-8">
          <h2 className="text-[15px] font-medium">Tracks</h2>
          <div className="mt-3 space-y-4 rounded-2xl border border-border bg-card p-5">
            {ROADMAPS.map((r) => (
              <ScoreRow
                key={r.key}
                value={member.solvedByList[r.key] ?? 0}
                total={Math.max(
                  member.solvedByList[r.key] ?? 0,
                  categories.reduce(
                    (n, c) => n + c.items.filter((p) => inList(p, r.key)).length,
                    0,
                  ),
                )}
                label={ROADMAP_LABEL[r.key]}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-[15px] font-medium">You and {displayName}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {comparisonNote(myTotal, theirTotal, displayName)}
        </p>
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <DifficultyBars
            caption={`Problems solved by difficulty, you compared with ${displayName}`}
            series={[
              { id: "you", label: "You", counts: myCounts },
              {
                id: "them",
                label: displayName.split(" ")[0],
                counts: theirCounts,
                hatched: true,
              },
            ]}
          />
        </div>
      </section>

      {/* ---- Their recent activity ----------------------------------------- */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium">Recent activity</h2>
          <Link
            to={paths.userActivity(handle ?? displayName)}
            className="text-xs font-medium text-coral hover:underline"
          >
            See all
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card px-5">
          {theirActivity.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">
              No solves in the recent feed yet.
            </li>
          )}
          {theirActivity.map((r) => (
            <li key={r.n} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{r.name}</div>
                {r.at && (
                  <div className="text-xs text-muted-foreground">{fmtShortDate(r.at)}</div>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}
              >
                {r.diff}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Solve history (friends only) ----------------------------------- */}
      {friend ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-tight">Solve history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <b className="text-foreground">
              {solvedCount} of {all.length}
            </b>{" "}
            solved. Open a solved problem to see how they solved it.
          </p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search problems…"
              aria-label="Search problems"
              className="w-full rounded-xl border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-coral"
            />
          </div>

          <div className="mt-6 space-y-6">
            {all.length === 0 ? (
              <p className="text-sm text-muted-foreground">No problems yet.</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No problems match “{query}”.</p>
            ) : null}
            {filtered.map((c) => {
              const solved = c.items.filter((p) => p.done).length;
              return (
                <div key={c.title}>
                  {/* Score-first per-topic summary: the count leads. */}
                  <ScoreRow value={solved} total={c.items.length} label={c.title} />
                  <ul className="mt-2 space-y-1">
                    {c.items.map((p) => (
                      <li
                        key={p.slug || p.name}
                        className="flex flex-col gap-2 rounded-xl px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                              p.done
                                ? "bg-coral text-white"
                                : "border border-border text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span
                            className={`min-w-0 flex-1 truncate text-sm ${
                              p.done ? "text-foreground" : "text-muted-foreground"
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
                              Solution
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

          {confirming ? (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Remove {friend.name}?</span>
              <button
                onClick={() => {
                  removeFriend(friend.id);
                  navigate(paths.friends(), { replace: true });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
              >
                <Trash2 className="h-4 w-4" /> Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-coral transition hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" /> Remove {friend.name}
            </button>
          )}
        </section>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Add {displayName} as a friend to see their solve history and streak.{" "}
          <Link to={paths.friends()} className="font-medium text-coral hover:underline">
            Manage friends
          </Link>
        </p>
      )}

      {openProblem && friend && (
        <FriendSolutionDialog
          friend={friend}
          problem={openProblem}
          onClose={() => setOpenProblem(null)}
        />
      )}
    </>
  );
}
