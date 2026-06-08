import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { TokenFn } from "../lib/api";
import { initialsOf, colorFor } from "../lib/avatar";
import { LoadingScreen } from "../components/LoadingScreen";
import type { Category, DifficultyTotal, Friend, Member, Problem, RecentItem } from "../types";

export type Calendar = { byDate: Record<string, number>; streak: number };

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(byDate: Record<string, number>): number {
  let streak = 0;
  const d = new Date();
  while ((byDate[fmtDate(d)] ?? 0) > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

type Data = {
  loading: boolean;
  categories: Category[];
  solved: number;
  total: number;
  difficultyBars: { label: string; color: string; done: number; total: number }[];
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
    const items = categories.flatMap((c) => c.items).filter((p) => p.diff === label);
    return {
      label,
      color: label === "Easy" ? "bg-sky" : label === "Medium" ? "bg-[#f5c26b]" : "bg-coral",
      done: items.filter((p) => p.done).length,
      total: items.length,
    };
  });
}

function groupByCategory(problems: { slug: string; title: string; difficulty: string; category: string; done: boolean; optimal: boolean }[]): Category[] {
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
    });
  }
  return order.map((title) => ({ title, items: map.get(title)! }));
}

export function DataProvider({ getToken, children }: { getToken: TokenFn; children: ReactNode }) {
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
    const groupTotals = await api.groupDifficulty(getToken).catch(() => []);
    const circle = await api.circleDifficulty(getToken).catch(() => []);
    const byDate: Record<string, number> = {};
    for (const d of days ?? []) byDate[d.date] = d.count;
    const categories = groupByCategory(progress ?? []);
    const apiFriends: Friend[] = (friendRows ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      initials: initialsOf(f.name),
      username: f.username,
      color: colorFor(f.username || f.name),
    }));
    const all = categories.flatMap((c) => c.items);
    const bars = difficultyBars(categories);
    const circleData = (circle ?? []).length
      ? (circle ?? []).map((d) => ({ label: d.label, val: d.count }))
      : bars.map((b) => ({ label: b.label, val: b.done }));
    setRemote({
      loading: false,
      categories,
      solved: all.filter((p) => p.done).length,
      total: all.length,
      difficultyBars: bars,
      members: (leaders ?? []).map((m) => ({
        name: m.name,
        initials: initialsOf(m.name),
        color: colorFor(m.username || m.name),
        solved: m.solved,
        username: m.username,
      })),
      recent: (recents ?? []).map((r) => ({
        n: r.n,
        slug: r.slug,
        name: r.name,
        diff: r.diff,
        who: r.who.map((name) => ({ name, initials: initialsOf(name), color: colorFor(name) })),
      })),
      friends: apiFriends,
      friendsDifficulty: circleData,
      groupTotals: groupTotals ?? [],
      calendar: { byDate, streak: computeStreak(byDate) },
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
          <p className="mt-2 break-words text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => { setError(null); refresh().catch((e) => setError(String(e))); }}
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
