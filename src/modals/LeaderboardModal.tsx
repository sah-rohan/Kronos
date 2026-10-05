import { useEffect, useState } from "react";
import { ChevronDown, Flame, Search } from "lucide-react";
import { Modal } from "../components/Modal";
import { initialsOf } from "../lib/avatar";
import { useData } from "../data/source";
import { api, type SdLeader } from "../lib/api";
import { ROADMAPS, listTotal } from "../lib/roadmaps";
import {
  useLeaderboardScope,
  type LeaderboardScope,
} from "../lib/leaderboardScope";
import { rankFor, maxWeighted, nextRank, rankMembers, TIER_MINS } from "../lib/rank";
import type { Member, ProblemList } from "../types";

const barColor: Record<string, string> = {
  Easy: "bg-easy",
  Medium: "bg-medium",
  Hard: "bg-hard",
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
      { label: "Easy", val: selected.byDiff.easy },
      { label: "Medium", val: selected.byDiff.medium },
      { label: "Hard", val: selected.byDiff.hard },
    ];
    const next = nextRank(
      selected.byDiff.easy,
      selected.byDiff.medium,
      selected.byDiff.hard,
      maxW,
      diffTotals,
    );
    return (
      <Modal
        title={selected.name}
        eyebrow={selected.username ? `@${selected.username}` : "Member"}
        onClose={onClose}
        onBack={() => setSelected(null)}
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-end gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ink text-lg font-medium text-ink-foreground">
              {selected.initials}
            </span>
            <div className="flex flex-col gap-1">
              <span className={`eyebrow ${r.text}`}>{r.tier}</span>
              <span className="font-display text-[56px] font-light leading-none">
                {r.rating}
                <span className="text-xl text-muted-foreground"> / 100 rating</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 border-y border-b-border border-t-foreground">
            {diffStats.map((d, i) => (
              <div key={d.label} className={`flex flex-col gap-1.5 py-4 ${i > 0 ? "border-l border-border pl-5" : ""}`}>
                <span className="eyebrow">{d.label}</span>
                <span className="font-display text-[34px] font-light leading-none">{d.val}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="eyebrow">Next tier</span>
            {next && next.opts.length > 0 ? (
              <p className="m-0 text-[15px] leading-relaxed">
                Reach <span className="font-medium">{next.tier}</span> by solving any of:{" "}
                {next.opts.map((o, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-muted-foreground"> · </span>}
                    {"combo" in o
                      ? o.combo.map((c, j) => (
                          <span key={c.diff}>
                            {j > 0 && " + "}
                            <span className="font-mono">{c.count}</span> {c.diff}
                          </span>
                        ))
                      : (
                          <span>
                            <span className="font-mono">{o.count}</span> more {o.diff}
                          </span>
                        )}
                  </span>
                ))}
              </p>
            ) : (
              <p className="m-0 text-[15px]">Top tier reached.</p>
            )}
          </div>

          <div className="flex flex-col">
            <span className="eyebrow pb-2">Tier thresholds</span>
            {TIER_MINS.map((t) => (
              <div key={t.tier} className="flex justify-between border-t border-border py-3 text-[15px]">
                <span className={r.tier === t.tier ? "font-medium" : "text-muted-foreground"}>{t.tier}</span>
                <span className="font-mono text-muted-foreground">{t.min}+</span>
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

  const ranked = rankMembers(members.filter(inScope), roadmap).filter(
    ({ m }) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.username ?? "").toLowerCase().includes(q),
  );

  const footer = (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Solved by everyone</span>
        <span className="font-display text-[28px] font-light leading-none">{groupSolved}</span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-sm bg-border">
        {totals.map((t) => (
          <div key={t.label} className={barColor[t.label] ?? "bg-easy"} style={{ flex: t.count }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
        {totals.map((t) => (
          <span key={t.label}>
            {t.label} <span className="font-mono text-foreground">{t.count}</span>
          </span>
        ))}
      </div>
    </div>
  );

  const boardLabel = [...ROADMAPS.map((r) => ({ id: r.key, label: r.label })), { id: "sd", label: "System Design" }, { id: "genai", label: "AI System Design" }];
  const avatar = (name: string, initials: string) => (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium ${
        name === userName ? "bg-ink text-ink-foreground" : "bg-border-strong text-foreground"
      }`}
    >
      {initials}
    </span>
  );

  return (
    <Modal
      title="Leaderboard"
      eyebrow={`Summer 2026 · ${members.length} member${members.length === 1 ? "" : "s"}`}
      onClose={onClose}
      footer={showSd ? undefined : footer}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border">
        <div className="flex gap-6">
          {(showSd ? [] : SCOPES).map((sc) => (
            <button
              key={sc.key}
              type="button"
              onClick={() => setScope(sc.key)}
              aria-pressed={scope === sc.key}
              className={`-mb-px min-h-11 border-b text-sm transition-colors ${
                scope === sc.key ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pb-2">
          {!showSd && (
            <label className="flex min-h-9 items-center gap-2 rounded-full border border-border-strong px-3.5 text-[13px] text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search people"
                className="w-28 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
          )}
          <span className="relative">
            <select
              value={type}
              aria-label="Board"
              onChange={(e) => {
                const v = e.target.value as Board;
                setType(v);
                if (v !== "sd" && v !== "genai") setRoadmap(v);
              }}
              className="min-h-9 appearance-none rounded-full border border-border-strong bg-transparent pl-3.5 pr-8 text-[13px] outline-none"
            >
              {boardLabel.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </span>
        </div>
      </div>

      {showSd ? (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="eyebrow w-8 pb-2.5 text-left font-medium">#</th>
              <th className="eyebrow pb-2.5 text-left font-medium">Member</th>
              <th className="eyebrow pb-2.5 text-right font-medium">Modules</th>
            </tr>
          </thead>
          <tbody>
            {sdLeaders.map((l, i) => (
              <tr key={l.name} className={l.name === userName ? "bg-muted" : ""}>
                <td className="border-t border-border py-3.5 font-display text-xl text-muted-foreground">{i + 1}</td>
                <td className="border-t border-border py-3.5">
                  <span className="flex items-center gap-3">
                    {avatar(l.name, initialsOf(l.name))}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-medium">{l.name}</span>
                      {l.username && <span className="truncate text-xs text-muted-foreground">@{l.username}</span>}
                    </span>
                  </span>
                </td>
                <td className="border-t border-border py-3.5 text-right font-mono text-[15px] font-medium">{l.count}</td>
              </tr>
            ))}
            {sdLeaders.length === 0 && (
              <tr>
                <td colSpan={3} className="border-t border-border py-6 text-sm text-muted-foreground">No one has completed a module yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="eyebrow w-8 pb-2.5 text-left font-medium">#</th>
                <th className="eyebrow pb-2.5 text-left font-medium">Member</th>
                <th className="eyebrow hidden pb-2.5 pl-3 text-right font-medium sm:table-cell">Easy</th>
                <th className="eyebrow hidden pb-2.5 pl-3 text-right font-medium sm:table-cell">Med</th>
                <th className="eyebrow hidden pb-2.5 pl-3 text-right font-medium sm:table-cell">Hard</th>
                <th className="eyebrow pb-2.5 pl-3 text-right font-medium">Solved</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ m, rank, solved }) => {
                const r = rankFor(m.byDiff.easy, m.byDiff.medium, m.byDiff.hard, maxW);
                const cell = "border-t border-border py-3.5";
                return (
                  <tr
                    key={m.name}
                    onClick={() => setSelected(m)}
                    className={`cursor-pointer transition-colors hover:bg-muted ${m.name === userName ? "bg-muted" : ""}`}
                  >
                    <td className={`${cell} font-display text-xl text-muted-foreground`}>{rank}</td>
                    <td className={cell}>
                      <button type="button" className="flex w-full items-center gap-3 text-left" aria-label={`Open ${m.name}`}>
                        {avatar(m.name, m.initials)}
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[15px] font-medium">{m.name}</span>
                          <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <span className={r.text}>{r.tier}</span>
                            <span aria-hidden>·</span>
                            {m.streak != null ? (
                              <>
                                <Flame className="h-3 w-3 shrink-0 text-accent" />
                                {m.streak}-day streak
                              </>
                            ) : (
                              <span className="truncate">@{m.username}</span>
                            )}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className={`${cell} hidden pl-3 text-right font-mono text-sm sm:table-cell`}>{m.byDiff.easy}</td>
                    <td className={`${cell} hidden pl-3 text-right font-mono text-sm sm:table-cell`}>{m.byDiff.medium}</td>
                    <td className={`${cell} hidden pl-3 text-right font-mono text-sm sm:table-cell`}>{m.byDiff.hard}</td>
                    <td className={`${cell} pl-3 text-right font-mono text-[15px] font-medium`}>
                      {solved}
                      <span className="text-muted-foreground">/{roadmapTotal}</span>
                    </td>
                  </tr>
                );
              })}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={6} className="border-t border-border py-6 text-sm text-muted-foreground">
                    {q
                      ? `No people match “${query}”.`
                      : scope === "friends"
                        ? "No friends on the leaderboard yet."
                        : "No people yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-3 hidden text-xs text-muted-foreground sm:block">
            Easy, Med and Hard count every problem solved; Solved counts this roadmap.
          </p>
        </>
      )}
    </Modal>
  );
}
