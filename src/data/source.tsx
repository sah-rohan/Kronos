import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import type { TokenFn, ApiProblem } from "../lib/api";
import { initialsOf, colorFor } from "../lib/avatar";
import { LoadingScreen } from "../components/LoadingScreen";
import type {
  CalendarProblem,
  Category,
  DifficultyTotal,
  Friend,
  Member,
  Problem,
  RecentItem,
} from "../types";

export type Calendar = {
  byDate: Record<string, number>;
  byDateProblems: Record<string, CalendarProblem[]>;
  streak: number;
};

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function computeStreak(
  byDate: Record<string, number>,
  seasonStart?: number,
): number {
  const d = new Date();
  if ((byDate[fmtDate(d)] ?? 0) === 0) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  const floor = seasonStart ? fmtDate(new Date(seasonStart * 1000)) : "";
  let streak = 0;
  while ((byDate[fmtDate(d)] ?? 0) > 0 && fmtDate(d) >= floor) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

type Data = {
  loading: boolean;
  categories: Category[];
  solved: number;
  total: number;
  difficultyBars: {
    label: string;
    color: string;
    done: number;
    total: number;
  }[];
  members: Member[];
  recent: RecentItem[];
  friends: Friend[];
  friendsDifficulty: { label: string; val: number }[];
  groupTotals: DifficultyTotal[];
  calendar: Calendar;
  addFriend: (username: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  getToken: TokenFn;
};

const DataContext = createContext<Data | null>(null);

export function useData(): Data {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

function difficultyBars(categories: Category[]) {
  return (["Easy", "Medium", "Hard"] as const).map((label) => {
    const items = categories
      .flatMap((c) => c.items)
      .filter((p) => p.diff === label);
    return {
      label,
      color:
        label === "Easy"
          ? "bg-sky"
          : label === "Medium"
            ? "bg-[#f5c26b]"
            : "bg-coral",
      done: items.filter((p) => p.done).length,
      total: items.length,
    };
  });
}

function groupByCategory(problems: ApiProblem[]): Category[] {
  const order: string[] = [];
  const map = new Map<string, Problem[]>();
  for (const p of problems) {
    if (!map.has(p.category)) {
      map.set(p.category, []);
      order.push(p.category);
    }
    map.get(p.category)!.push({
      name: p.title,
      slug: p.slug,
      diff: p.difficulty as Problem["diff"],
      done: p.done,
      optimal: p.optimal,
      blind75: p.blind75,
      neetcode150: p.neetcode150,
      neetcode250: p.neetcode250,
    });
  }
  return order.map((title) => ({ title, items: map.get(title)! }));
}

export function DataProvider({
  getToken,
  seasonStart,
  children,
}: {
  getToken: TokenFn;
  seasonStart?: number;
  children: ReactNode;
}) {
  const [remote, setRemote] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const [progress, leaders, recents, friendRows] = await Promise.all([
      api.progress(getToken),
      api.leaderboard(getToken),
      api.recent(getToken),
      api.friends(getToken),
    ]);
    const days = await api.calendar(getToken).catch(() => []);
    const calProblems = await api.calendarProblems(getToken).catch(() => []);
    const groupTotals = await api.groupDifficulty(getToken).catch(() => []);
    const circle = await api.circleDifficulty(getToken).catch(() => []);
    const byDate: Record<string, number> = {};
    for (const d of days ?? []) byDate[d.date] = d.count;
    const byDateProblems: Record<string, CalendarProblem[]> = {};
    for (const p of calProblems ?? []) {
      (byDateProblems[p.date] ??= []).push({
        slug: p.slug,
        name: p.title,
        diff: p.difficulty,
      });
    }
    const categories = groupByCategory(progress ?? []);
    // Back-compat: if the API hasn't shipped the list flags yet, treat every
    // problem as NeetCode 150 so Progress/leaderboard aren't empty pre-deploy.
    const hasFlags = categories.some((c) =>
      c.items.some((p) => p.neetcode150 || p.blind75 || p.neetcode250),
    );
    if (!hasFlags) {
      for (const c of categories) for (const p of c.items) p.neetcode150 = true;
    }
    const apiFriends: Friend[] = (friendRows ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      initials: initialsOf(f.name),
      username: f.username,
      color: colorFor(f.name),
    }));
    const n150cats = categories
      .map((c) => ({ ...c, items: c.items.filter((p) => p.neetcode150) }))
      .filter((c) => c.items.length > 0);
    const n150all = n150cats.flatMap((c) => c.items);
    const bars = difficultyBars(n150cats);
    const circleData = (circle ?? []).length
      ? (circle ?? []).map((d) => ({ label: d.label, val: d.count }))
      : bars.map((b) => ({ label: b.label, val: b.done }));
    setRemote({
      loading: false,
      categories,
      solved: n150all.filter((p) => p.done).length,
      total: n150all.length,
      difficultyBars: bars,
      members: (leaders ?? []).map((m) => ({
        name: m.name,
        initials: initialsOf(m.name),
        color: colorFor(m.name),
        solved: m.neetcode150,
        solvedByList: {
          blind75: m.blind75,
          neetcode150: m.neetcode150,
          neetcode250: m.neetcode250,
          all: m.all,
        },
        username: m.username,
      })),
      recent: (recents ?? []).map((r) => ({
        n: r.n,
        slug: r.slug,
        name: r.name,
        diff: r.diff,
        who: (r.who ?? []).map((name) => ({
          name,
          initials: initialsOf(name),
          color: colorFor(name),
        })),
        at: r.at,
      })),
      friends: apiFriends,
      friendsDifficulty: circleData,
      groupTotals: groupTotals ?? [],
      calendar: { byDate, byDateProblems, streak: computeStreak(byDate, seasonStart) },
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
  };

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
    const quiet = () => refresh().catch(() => {});
    const id = setInterval(quiet, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") quiet();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", quiet);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", quiet);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
          <div className="font-display text-xl">Couldn't load your data</div>
          <p className="mt-2 break-words text-sm text-muted-foreground">
            {error}
          </p>
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

  if (!remote) {
    return <LoadingScreen />;
  }

  return <DataContext.Provider value={remote}>{children}</DataContext.Provider>;
}
