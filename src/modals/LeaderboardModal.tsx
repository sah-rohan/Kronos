import { useEffect, useState } from "react";
import { Crown, Flame, Search } from "lucide-react";
import { Modal } from "../components/Modal";
import { OptionPicker } from "../components/OptionPicker";
import { useData } from "../data/source";
import { api, type SdLeader } from "../lib/api";
import { ROADMAPS, listTotal } from "../lib/roadmaps";
import {
  useLeaderboardScope,
  type LeaderboardScope,
} from "../lib/leaderboardScope";
import { rankFor, maxWeighted, nextRank, TIER_MINS } from "../lib/rank";
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
  const { members, friends, categories, groupTotals, friendsDifficulty, getToken } =
    useData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const q = query.trim().toLowerCase();
  const roadmapTotal = listTotal(categories, roadmap);
  const maxW = maxWeighted(categories);
  // Per-difficulty catalog totals, so "more to next rank" never exceeds what's left.
  const diffTotals = (() => {
    const t = { easy: 0, medium: 0, hard: 0 };
    for (const c of categories)
      for (const p of c.items) {
        if (p.diff === "Easy") t.easy++;
        else if (p.diff === "Medium") t.medium++;
        else t.hard++;
      }
    return t;
  })();
  const { scope, setScope } = useLeaderboardScope();

  // "type" is the leaderboard board: a roadmap, the System Design ranking, or
  // the AI System Design ranking. The choice is cached so it persists across
  // opens / reloads.
  type Board = ProblemList | "sd" | "genai";
  const [type, setType] = useState<Board>(() => {
    const saved = localStorage.getItem("lb-type") as Board | null;
    return saved ?? roadmap;
  });
  useEffect(() => {
    localStorage.setItem("lb-type", type);
  }, [type]);

  const [sdLeaders, setSdLeaders] = useState<SdLeader[]>([]);
  const showSd = type === "sd" || type === "genai";
  useEffect(() => {
    if (showSd) {
      api
        .sdLeaderboard(getToken, type === "genai" ? "genai" : "design")
        .then((l) => setSdLeaders(l ?? []))
        .catch(() => {});
    }
  }, [showSd, type, getToken]);

  const friendUsernames = new Set(friends.map((f) => f.username));

  const inScope = (m: Member) => {
    if (scope !== "friends") return true;
    return (
      m.name === userName || (!!m.username && friendUsernames.has(m.username))
    );
  };

  if (selected) {
    const r = rankFor(
      selected.byDiff.easy,
      selected.byDiff.medium,
      selected.byDiff.hard,
      maxW,
    );
    const diffStats = [
      { label: "Easy", val: selected.byDiff.easy, color: "text-[#3fae6a]" },
      { label: "Medium", val: selected.byDiff.medium, color: "text-[#f5c26b]" },
      { label: "Hard", val: selected.byDiff.hard, color: "text-coral" },
    ];
    const next = nextRank(
      selected.byDiff.easy,
      selected.byDiff.medium,
      selected.byDiff.hard,
      maxW,
      diffTotals,
    );
    const diffColor = {
      easy: "text-[#3fae6a]",
      medium: "text-[#f5c26b]",
      hard: "text-coral",
    } as const;
    return (
      <Modal
        title={selected.name}
        onClose={onClose}
        onBack={() => setSelected(null)}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={`grid h-20 w-20 place-items-center rounded-full text-xl font-medium ${selected.color}`}
          >
            {selected.initials}
          </div>
          <span
            className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${r.badge}`}
          >
            {r.tier}
          </span>
          <div className="mt-5 flex items-baseline justify-center gap-1">
            <span className="text-6xl font-semibold tabular-nums">
              {r.rating}
            </span>
            <span className="text-xl font-medium text-muted-foreground">
              /100
            </span>
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            rating
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-3">
          {diffStats.map((d) => (
            <div
              key={d.label}
              className="rounded-2xl border border-border py-3 text-center"
            >
              <div className={`text-2xl font-semibold tabular-nums ${d.color}`}>
                {d.val}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {d.label}
              </div>
            </div>
          ))}
        </div>

        {next && next.opts.length > 0 ? (
          <div className="mt-4 rounded-2xl bg-muted px-4 py-3 text-center text-sm">
            <div className="text-muted-foreground">
              To reach{" "}
              <span className="font-medium text-foreground">{next.tier}</span>,
              solve any of:
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 font-medium">
              {next.opts.map((o, i) =>
                "combo" in o ? (
                  <span key={i}>
                    {o.combo.map((c, j) => (
                      <span key={c.diff}>
                        {j > 0 && " + "}
                        <span className={diffColor[c.diff]}>
                          {c.count}
                        </span>{" "}
                        {c.diff}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span key={i}>
                    <span className={diffColor[o.diff]}>{o.count}</span> more{" "}
                    {o.diff}
                  </span>
                ),
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-muted px-4 py-3 text-center text-sm font-medium">
            Top tier reached 🏆
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Rank thresholds
          </div>
          <div className="space-y-1.5">
            {TIER_MINS.map((t) => (
              <div
                key={t.tier}
                className="flex items-center justify-between text-sm"
              >
                <span
                  className={
                    r.tier === t.tier
                      ? "font-semibold"
                      : "text-muted-foreground"
                  }
                >
                  {t.tier}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {t.min}+
                </span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  }

  const totals =
    groupTotals.length > 0
      ? groupTotals
      : friendsDifficulty.map((d) => ({ label: d.label, count: d.val }));
  const groupSolved = totals.reduce((sum, t) => sum + t.count, 0);

  // Rank within the chosen scope so #1 is the top of the filtered set. Ties share
  // a rank (competition ranking: 1, 2, 2, 4).
  let lastVal: number | null = null;
  let lastRank = 0;
  const ranked = [...members]
    .filter((m) => inScope(m))
    .sort(
      (a, b) => (b.solvedByList[roadmap] ?? 0) - (a.solvedByList[roadmap] ?? 0),
    )
    .map((m, i) => {
      const v = m.solvedByList[roadmap] ?? 0;
      const rank = i > 0 && v === lastVal ? lastRank : i + 1;
      lastVal = v;
      lastRank = rank;
      return { m, rank };
    })
    .filter(
      ({ m }) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.username ?? "").toLowerCase().includes(q),
    );

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
            style={{
              width:
                groupSolved > 0 ? `${(t.count / groupSolved) * 100}%` : "0%",
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {totals.map((t) => (
          <div key={t.label} className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${barColor[t.label] ?? "bg-sky"}`}
            />
            {t.label}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {t.count}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <Modal title="Summer 2026 Leaderboard" onClose={onClose} footer={showSd ? undefined : footer}>
      <OptionPicker
        className="mb-4"
        value={type}
        onSelect={(id) => {
          const v = id as Board;
          setType(v);
          if (v !== "sd" && v !== "genai") setRoadmap(v);
        }}
        options={[
          ...ROADMAPS.map((r) => ({ id: r.key, label: r.label })),
          { id: "sd", label: "System Design" },
          { id: "genai", label: "AI System Design" },
        ]}
      />

      {showSd && (
        <ul className="space-y-3">
          {sdLeaders.map((l, i) => (
            <li key={l.name} className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5">
              <div className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{l.name}</div>
                {l.username && <div className="truncate text-xs text-muted-foreground">@{l.username}</div>}
              </div>
              <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                {l.count}<span className="text-muted-foreground"> solved</span>
              </div>
            </li>
          ))}
          {sdLeaders.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No one has completed a module yet.</li>
          )}
        </ul>
      )}

      {!showSd && (
      <>
      <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-border bg-background/60 p-1">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              scope === s.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
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
          const r = rankFor(
            m.byDiff.easy,
            m.byDiff.medium,
            m.byDiff.hard,
            maxW,
          );
          return (
            <li
              key={m.name}
              onClick={() => setSelected(m)}
              className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border px-4 py-3.5 transition hover:bg-muted sm:gap-5 sm:px-5 sm:py-4"
            >
              <div className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums sm:text-base">
                {rank}
              </div>
              <div
                className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium sm:h-12 sm:w-12 ${m.color}`}
              >
                {m.initials}
                {rank === 1 && (
                  <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium sm:text-[15px]">
                    {m.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${r.badge}`}
                  >
                    {r.tier}
                  </span>
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
                    style={{
                      width: `${roadmapTotal ? ((m.solvedByList[roadmap] ?? 0) / roadmapTotal) * 100 : 0}%`,
                    }}
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
      </>
      )}
    </Modal>
  );
}
