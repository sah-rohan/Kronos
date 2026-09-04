import { useEffect, useState } from "react";
import { Crown, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ScopeRadioGroup } from "../components/ScopeRadioGroup";
import { useData } from "../data/context";
import { api, type SdLeader } from "../lib/api";
import { ROADMAPS, ROADMAP_LABEL, listTotal } from "../lib/roadmaps";
import { rankFor, maxWeighted } from "../lib/rank";
import { DIFFICULTY, difficultyBg } from "../lib/difficulty";
import { solvedInWindow, weeklyDelta } from "../lib/momentum";
import { useToday } from "../lib/calendar";
import { initialsOf, colorFor } from "../lib/avatar";
import { isTrack, paths, DEFAULT_TRACK } from "../lib/slugs";
import {
  useDashboardBoard,
  useLeaderboardScope,
  useTrackFilters,
} from "../lib/searchParams";
import { useShell } from "../app/shell";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import type { Member } from "../types";

const barColor: Record<string, string> = Object.fromEntries(
  DIFFICULTY.map((d) => [d.label, difficultyBg(d)]),
);

export function Leaderboard() {
  const { members, friends, categories, groupTotals, friendsDifficulty, recent, getToken } =
    useData();
  const { userName } = useShell();
  const today = useToday();
  const [board, setBoard] = useDashboardBoard();
  const [scope, setScope] = useLeaderboardScope();
  const { query, setQuery } = useTrackFilters();

  const showSd = board === "sd" || board === "genai";
  const roadmap = isTrack(board) ? board : DEFAULT_TRACK;

  const [sdLeaders, setSdLeaders] = useState<SdLeader[]>([]);
  useEffect(() => {
    if (showSd) {
      api
        .sdLeaderboard(getToken, board === "genai" ? "genai" : "design")
        .then((l) => setSdLeaders(l ?? []))
        .catch(() => setSdLeaders([]));
    }
  }, [showSd, board, getToken]);

  const q = query.trim().toLowerCase();
  const roadmapTotal = listTotal(categories, roadmap);
  const maxW = maxWeighted(categories);
  const friendUsernames = new Set(friends.map((f) => f.username));

  const inScope = (name: string, username?: string) =>
    scope !== "friends" ||
    name === userName ||
    (!!username && friendUsernames.has(username));

  const totals =
    groupTotals.length > 0
      ? groupTotals
      : friendsDifficulty.map((d) => ({ label: d.label, count: d.val }));
  const groupSolved = totals.reduce((sum, t) => sum + t.count, 0);

  const ranked = [...members]
    .filter((m) => inScope(m.name, m.username))
    .sort((a, b) => (b.solvedByList[roadmap] ?? 0) - (a.solvedByList[roadmap] ?? 0))
    .reduce<{ m: Member; rank: number }[]>((acc, m, i) => {
      const v = m.solvedByList[roadmap] ?? 0;
      const prev = acc[i - 1];
      const rank =
        prev !== undefined && v === (prev.m.solvedByList[roadmap] ?? 0)
          ? prev.rank
          : i + 1;
      return [...acc, { m, rank }];
    }, [])
    .filter(
      ({ m }) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.username ?? "").toLowerCase().includes(q),
    );

  const sdTotal = board === "genai" ? GENAI_PROBLEMS.length : SD_PROBLEMS.length;
  const visibleSd = sdLeaders.filter((l) => inScope(l.name, l.username));

  return (
    <>
      <PageHeader
        title="Summer 2026 Leaderboard"
        backTo={paths.dashboard()}
        backLabel="Dashboard"
        subtitle={
          showSd
            ? `${board === "genai" ? "AI System Design" : "System Design"} — ${sdTotal} modules`
            : `${ROADMAP_LABEL[roadmap]} — ${roadmapTotal} problems`
        }
      />

      {/* Board picker */}
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-background/60 p-1">
        {[
          ...ROADMAPS.map((r) => ({ id: r.key, label: r.label })),
          { id: "sd" as const, label: "System Design" },
          { id: "genai" as const, label: "AI System Design" },
        ].map((o) => (
          <button
            key={o.id}
            onClick={() => setBoard(o.id as Parameters<typeof setBoard>[0])}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              board === o.id
                ? "bg-coral text-coral-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Scope — always visible, on every board. Finding #5. */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ScopeRadioGroup scope={scope} onChange={setScope} size="md" />
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            aria-label="Search people"
            className="w-full rounded-xl border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-coral"
          />
        </div>
      </div>

      {showSd ? (
        <ul className="mt-5 space-y-3">
          {visibleSd.map((l, i) => (
            <li
              key={l.name}
              className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5"
            >
              <div className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
                {i + 1}
              </div>
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium ${colorFor(l.name)}`}
              >
                {initialsOf(l.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{l.name}</div>
                {l.username && (
                  <div className="truncate text-xs text-muted-foreground">@{l.username}</div>
                )}
              </div>
              <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                {l.count}
                <span className="text-muted-foreground"> /{sdTotal}</span>
              </div>
            </li>
          ))}
          {visibleSd.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No one has completed a module yet.
            </li>
          )}
        </ul>
      ) : (
        <>
          <ul className="mt-5 space-y-3">
            {ranked.map(({ m, rank }) => {
              const r = rankFor(m.byDiff.easy, m.byDiff.medium, m.byDiff.hard, maxW);
              // Every row states its own status: rank, tier, momentum, count.
              const week = weeklyDelta(solvedInWindow(recent, m.name, today.key));
              return (
                <li key={m.name}>
                  {/* A link, not an onClick row: the member detail is /u/:handle. */}
                  <Link
                    to={paths.user(m.username ?? m.name)}
                    className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5 transition hover:bg-muted sm:gap-5 sm:px-5 sm:py-4"
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
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={
                            week.active ? "font-medium text-coral" : "text-muted-foreground"
                          }
                        >
                          {week.label}
                        </span>
                        {m.username && (
                          <span className="truncate text-muted-foreground">@{m.username}</span>
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
                  </Link>
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

          <div className="mt-8 rounded-2xl border border-border bg-card p-5">
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
                    width: groupSolved > 0 ? `${(t.count / groupSolved) * 100}%` : "0%",
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {totals.map((t) => (
                <div key={t.label} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${barColor[t.label] ?? "bg-sky"}`} />
                  {t.label}{" "}
                  <span className="font-medium text-foreground tabular-nums">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
