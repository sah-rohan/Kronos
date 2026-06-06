import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useApi } from "../lib/env";
import { api } from "../lib/api";
import type { TokenFn } from "../lib/api";
import { initialsOf, colorFor } from "../lib/avatar";
import { categories as mockCategories } from "./problems";
import { members as mockMembers, recent as mockRecent, avatarColor, nameByInitials } from "./members";
import { initialFriends, friendSolved } from "./friends";
import type { Category, Friend, Member, Problem, RecentItem } from "../types";

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
  addFriend: (username: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
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

function friendsDifficulty(categories: Category[], friends: Friend[]) {
  const all = categories.flatMap((c) => c.items);
  return (["Easy", "Medium", "Hard"] as const).map((label) => {
    let val = all.filter((p) => p.diff === label && p.done).length;
    for (const f of friends) {
      val += all.filter((p) => p.diff === label && friendSolved(f, p.name)).length;
    }
    return { label, val };
  });
}

function mockData(friends: Friend[], setFriends: (f: Friend[]) => void, getToken: TokenFn): Data {
  const recent: RecentItem[] = mockRecent.map((r) => ({
    n: r.n,
    name: r.name,
    diff: r.diff,
    who: r.who.map((i) => ({ name: nameByInitials[i] ?? i, initials: i, color: avatarColor[i] ?? "bg-muted" })),
  }));
  const all = mockCategories.flatMap((c) => c.items);
  return {
    loading: false,
    categories: mockCategories,
    solved: all.filter((p) => p.done).length,
    total: all.length,
    difficultyBars: difficultyBars(mockCategories),
    members: mockMembers,
    recent,
    friends,
    friendsDifficulty: friendsDifficulty(mockCategories, friends),
    async addFriend(username) {
      if (!username || friends.some((f) => f.username === username)) return;
      const palette = ["bg-coral text-white", "bg-sky text-sky-foreground", "bg-[#f5c26b] text-[#5a3a0a]", "bg-[#111] text-white"];
      setFriends([...friends, { name: username, initials: username.slice(0, 2).toUpperCase(), username, color: palette[friends.length % palette.length] }]);
    },
    async removeFriend(id) {
      setFriends(friends.filter((f) => f.username !== id && f.name !== id));
    },
    getToken,
  };
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
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [remote, setRemote] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const [progress, leaders, recents, friendRows] = await Promise.all([
      api.progress(getToken),
      api.leaderboard(getToken),
      api.recent(getToken),
      api.friends(getToken),
    ]);
    const categories = groupByCategory(progress);
    const apiFriends: Friend[] = friendRows.map((f) => ({
      name: f.name,
      initials: initialsOf(f.name),
      username: f.id,
      color: colorFor(f.username || f.name),
    }));
    const all = categories.flatMap((c) => c.items);
    setRemote({
      loading: false,
      categories,
      solved: all.filter((p) => p.done).length,
      total: all.length,
      difficultyBars: difficultyBars(categories),
      members: leaders.map((m) => ({
        name: m.name,
        initials: initialsOf(m.name),
        color: colorFor(m.username || m.name),
        solved: m.solved,
        username: m.username,
      })),
      recent: recents.map((r) => ({
        n: r.n,
        name: r.name,
        diff: r.diff,
        who: r.who.map((name) => ({ name, initials: initialsOf(name), color: colorFor(name) })),
      })),
      friends: apiFriends,
      friendsDifficulty: friendsDifficulty(categories, apiFriends),
      async addFriend(username) {
        await api.addFriend(getToken, username);
        await refresh();
      },
      async removeFriend(id) {
        await api.removeFriend(getToken, id);
        await refresh();
      },
      getToken,
    });
  };

  useEffect(() => {
    if (useApi) refresh().catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (useApi && error) {
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

  if (useApi && !remote) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>
    );
  }

  const value = useApi && remote ? remote : mockData(friends, setFriends, getToken);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
