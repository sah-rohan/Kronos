import { useState } from "react";
import { Crown, Flame, Search } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import { ROADMAPS, listTotal } from "../lib/roadmaps";
import { useLeaderboardScope, type LeaderboardScope } from "../lib/leaderboardScope";
import { rankFor, maxWeighted } from "../lib/rank";
import type { Member, ProblemList } from "../types";

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
  userName,
}: {
  onClose: () => void;
  roadmap: ProblemList;
  setRoadmap: (r: ProblemList) => void;
  userName: string;
}) {
  const { members, friends, categories, groupTotals, friendsDifficulty } = useData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const q = query.trim().toLowerCase();
  const roadmapTotal = listTotal(categories, roadmap);
  const maxW = maxWeighted(categories);
  const { scope, setScope } = useLeaderboardScope();

  const friendUsernames = new Set(friends.map((f) => f.username));

  const inScope = (m: Member) => {
    if (scope !== "friends") return true;
    return m.name === userName || (!!m.username && friendUsernames.has(m.username));
  };

  if (selected) {
    const r = rankFor(selected.byDiff.easy, selected.byDiff.medium, selected.byDiff.hard, maxW);
    const diffStats = [
      { label: "Easy", val: selected.byDiff.easy, color: "text-[#3fae6a]" },
      { label: "Medium", val: selected.byDiff.medium, color: "text-[#f5c26b]" },
      { label: "Hard", val: selected.byDiff.hard, color: "text-coral" },
    ];
    return (
      <Modal title={selected.name} onClose={onClose} onBack={() => setSelected(null)} fitContent>
        <div className="flex flex-col items-center text-center">
          <div className={`grid h-20 w-20 place-items-center rounded-full text-xl font-medium ${selected.color}`}>
            {selected.initials}
          </div>
          <span className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${r.badge}`}>
            {r.tier}
          </span>
          <div className="mt-5 flex items-baseline justify-center gap-1">
            <span className="text-6xl font-semibold tabular-nums">{r.rating}</span>
            <span className="text-xl font-medium text-muted-foreground">/100</span>
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">rating</div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-3">
          {diffStats.map((d) => (
            <div key={d.label} className="rounded-2xl border border-border py-3 text-center">
              <div className={`text-2xl font-semibold tabular-nums ${d.color}`}>{d.val}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{d.label}</div>
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  const totals = groupTotals.length > 0
    ? groupTotals
    : friendsDifficulty.map((d) => ({ label: d.label, count: d.val }));
  const groupSolved = totals.reduce((sum, t) => sum + t.count, 0);

  // Rank within the chosen scope so #1 is the top of the filtered set. Ties share
  // a rank (competition ranking: 1, 2, 2, 4).
  let lastVal: number | null = null;
  let lastRank = 0;
  const ranked = [...members]
    .filter((m) => inScope(m))
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
        {ranked.map(({ m, rank }) => {
          const r = rankFor(m.byDiff.easy, m.byDiff.medium, m.byDiff.hard, maxW);
          return (
          <li
            key={m.name}
            onClick={() => setSelected(m)}
            className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border px-4 py-3.5 transition hover:bg-muted sm:gap-5 sm:px-5 sm:py-4"
          >
            <div className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums sm:text-base">{rank}</div>
            <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium sm:h-12 sm:w-12 ${m.color}`}>
              {m.initials}
              {rank === 1 && (
                <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium sm:text-[15px]">{m.name}</span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${r.badge}`}>{r.tier}</span>
              </div>
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
          );
        })}
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
