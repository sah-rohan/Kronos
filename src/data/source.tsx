import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, type TokenFn } from "../lib/api";
import { DIFFS } from "../lib/difficulty";
import { LoadingScreen } from "../components/LoadingScreen";
import { DataContext, type Data } from "./context";
import { computeStreak, toCalendar, toCategories, toPerson } from "./transform";

const REFRESH_MS = 30000;

// These can fail for a Google-only user who hasn't linked their LeetCode
// account yet. Fall back to empty so the dashboard still renders (the LeetCode
// cards show locked); System Design stays usable.
const orEmpty = <T,>(p: Promise<T[]>) => p.then((r) => r ?? []).catch(() => [] as T[]);

export function DataProvider({
  getToken,
  seasonStart,
  children,
}: {
  getToken: TokenFn;
  seasonStart?: number;
  children: ReactNode;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async function refresh(): Promise<void> {
    const [progress, leaders, recents, friends, days, calProblems, groupTotals, circle] = await Promise.all([
      orEmpty(api.progress(getToken)),
      orEmpty(api.leaderboard(getToken)),
      orEmpty(api.recent(getToken)),
      orEmpty(api.friends(getToken)),
      orEmpty(api.calendar(getToken)),
      orEmpty(api.calendarProblems(getToken)),
      orEmpty(api.groupDifficulty(getToken)),
      orEmpty(api.circleDifficulty(getToken)),
    ]);

    const categories = toCategories(progress);
    // Back-compat: if the API hasn't shipped the list flags yet, treat every
    // problem as NeetCode 150 so Progress/leaderboard aren't empty pre-deploy.
    const all = categories.flatMap((c) => c.items);
    if (!all.some((p) => p.neetcode150 || p.blind75 || p.neetcode250)) for (const p of all) p.neetcode150 = true;

    const calendar = toCalendar(days, calProblems);
    // Without circle totals from the API, fall back to your own NeetCode 150 solves.
    const friendsDifficulty = circle.length
      ? circle.map((d) => ({ label: d.label, val: d.count }))
      : DIFFS.map((label) => ({ label, val: all.filter((p) => p.neetcode150 && p.diff === label && p.done).length }));

    setData({
      categories,
      members: leaders.map((m) => ({
        ...toPerson(m.name),
        solved: m.neetcode150,
        solvedByList: { blind75: m.blind75, neetcode150: m.neetcode150, neetcode250: m.neetcode250, all: m.all },
        byDiff: { easy: m.easy, medium: m.medium, hard: m.hard },
        username: m.username,
      })),
      recent: recents.map((r) => ({ ...r, who: (r.who ?? []).map(toPerson) })),
      friends: friends.map((f) => ({ ...toPerson(f.name), id: f.id, username: f.username })),
      friendsDifficulty,
      groupTotals,
      calendar: { ...calendar, streak: computeStreak(calendar.byDate, seasonStart) },
      async addFriend(username) {
        await api.addFriend(getToken, username);
        await refresh();
      },
      async removeFriend(id) {
        await api.removeFriend(getToken, id);
        await refresh();
      },
      refresh,
      getToken,
    });
  }, [getToken, seasonStart]);

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
    api.visit(getToken).catch(() => {}); // log one app open for admin analytics
    const quiet = () => refresh().catch(() => {});
    const onVisible = () => document.visibilityState === "visible" && quiet();
    const id = setInterval(quiet, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", quiet);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", quiet);
    };
  }, [refresh, getToken]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
          <div className="font-display text-xl">Couldn't load your data</div>
          <p className="mt-2 break-words text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => {
              setError(null);
              refresh().catch((e) => setError(String(e)));
            }}
            className="mt-4 rounded-full bg-coral px-4 py-2 text-sm font-medium text-coral-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <LoadingScreen />;

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}
