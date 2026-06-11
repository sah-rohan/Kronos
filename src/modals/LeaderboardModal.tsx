import { useState } from "react";
import { Crown, Flame, Search } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import { ROADMAPS, listTotal } from "../lib/roadmaps";
import { useLeaderboardScope, type LeaderboardScope } from "../lib/leaderboardScope";
import type { ProblemList } from "../types";

const barColor: Record<string, string> = {
  Easy: "bg-sky",
  Medium: "bg-[#f5c26b]",
  Hard: "bg-coral",
};

const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: "everyone", label: "Everyone" },
  { key: "friends", label: "Friends" },
];

export function LeaderboardModal({
  onClose,
  roadmap,
  setRoadmap,
}: {
  onClose: () => void;
  roadmap: ProblemList;
  setRoadmap: (r: ProblemList) => void;
}) {
  const { members, friends, categories, groupTotals, friendsDifficulty } = useData();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const roadmapTotal = listTotal(categories, roadmap);
  const { scope, setScope } = useLeaderboardScope();

  const friendUsernames = new Set(friends.map((f) => f.username));

  const inScope = (username?: string) => {
    if (scope === "friends") return !!username && friendUsernames.has(username);
    return true;
  };

  const totals = groupTotals.length > 0
    ? groupTotals
    : friendsDifficulty.map((d) => ({ label: d.label, count: d.val }));
  const groupSolved = totals.reduce((sum, t) => sum + t.count, 0);

  // Rank within the chosen scope so #1 is the top of the filtered set. Ties share
  // a rank (competition ranking: 1, 2, 2, 4).
  let lastVal: number | null = null;
  let lastRank = 0;
  const ranked = [...members]
    .filter((m) => inScope(m.username))
    .sort((a, b) => (b.solvedByList[roadmap] ?? 0) - (a.solvedByList[roadmap] ?? 0))
    .map((m, i) => {
      const v = m.solvedByList[roadmap] ?? 0;
      const rank = i > 0 && v === lastVal ? lastRank : i + 1;
      lastVal = v;
      lastRank = rank;
      return { m, rank };
    })
    .filter(({ m }) => !q || m.name.toLowerCase().includes(q) || (m.username ?? "").toLowerCase().includes(q));

  const footer = (
    <>
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">Total solved by everyone</div>
        <div className="text-sm font-semibold tabular-nums">{groupSolved}</div>
      </div>
      <div className="mt-3 flex h-3.5 w-full overflow-hidden rounded-full bg-muted">
        {totals.map((t) => (
          <div
            key={t.label}
            className={barColor[t.label] ?? "bg-sky"}
            style={{ width: groupSolved > 0 ? `${(t.count / groupSolved) * 100}%` : "0%" }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {totals.map((t) => (
          <div key={t.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${barColor[t.label] ?? "bg-sky"}`} />
            {t.label} <span className="font-medium text-foreground tabular-nums">{t.count}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <Modal title="Summer 2026 Leaderboard" onClose={onClose} footer={footer}>
      <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-border bg-background/60 p-1">
        {ROADMAPS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRoadmap(r.key)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              roadmap === r.key ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-border bg-background/60 p-1">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              scope === s.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          className="w-full rounded-xl border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-coral"
        />
      </div>

      <ul className="space-y-3">
        {ranked.map(({ m, rank }) => (
          <li key={m.name} className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5 sm:gap-5 sm:px-5 sm:py-4">
            <div className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums sm:text-base">{rank}</div>
            <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium sm:h-12 sm:w-12 ${m.color}`}>
              {m.initials}
              {rank === 1 && (
                <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium sm:text-[15px]">{m.name}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {m.streak != null ? (
                  <>
                    <Flame className="h-3 w-3 shrink-0 text-coral" />
                    {m.streak}-day streak
                  </>
                ) : (
                  <span className="truncate">@{m.username}</span>
                )}
              </div>
            </div>
            <div className="hidden flex-1 sm:block">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={rank === 1 ? "h-full bg-coral" : "h-full bg-sky"}
                  style={{ width: `${roadmapTotal ? ((m.solvedByList[roadmap] ?? 0) / roadmapTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right text-sm font-semibold tabular-nums sm:text-base">
              {m.solvedByList[roadmap] ?? 0}
              <span className="text-muted-foreground"> /{roadmapTotal}</span>
            </div>
          </li>
        ))}
        {ranked.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            {q
              ? `No people match “${query}”.`
              : scope === "friends"
                ? "No friends on the leaderboard yet."
                : "No people yet."}
          </li>
        )}
      </ul>
    </Modal>
  );
}
