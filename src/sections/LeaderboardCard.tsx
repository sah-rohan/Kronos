/**
 * The dashboard leaderboard card.
 *
 * Audit finding #5 — scope and rank are on the card, not hidden behind a click:
 * the Everyone/Friends control is a real radio group here, bound to the same
 * `useLeaderboardScope()` hook the `/leaderboard` route uses, so both read the
 * same `?scope=` param. Tier badges render on the rows too.
 *
 * Audit finding #2 — every row is an `EntryPoint` to that person's profile, with
 * the same chevron affordance the cards use, and the card itself carries the
 * standard "View full leaderboard ›" entry point at its trailing edge.
 */
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { ABOVE_STRETCH, EntryPoint } from "../components/EntryPoint";
import { ScopeRadioGroup } from "../components/ScopeRadioGroup";
import { useData } from "../data/context";
import { api, type SdLeader } from "../lib/api";
import { ROADMAP_LABEL, listTotal } from "../lib/roadmaps";
import { rankFor, maxWeighted } from "../lib/rank";
import { initialsOf, colorFor } from "../lib/avatar";
import { paths } from "../lib/slugs";
import { useLeaderboardScope, DEFAULT_SCOPE, type LeaderboardScope } from "../lib/searchParams";
import { solvedInWindow, weeklyDelta } from "../lib/momentum";
import { useToday } from "../lib/calendar";
import { useShell } from "../app/shell";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import type { Member, ProblemList } from "../types";

/**
 * Competition ranking: tied solvers share a rank (1, 2, 2, 4).
 *
 * A fold rather than a loop over reassigned locals, which tripped
 * `react-hooks/immutability` when this logic was duplicated across two files.
 */
function withCompetitionRanks<T>(rows: T[], valueOf: (row: T) => number) {
  return rows.reduce<{ row: T; rank: number }[]>((acc, row, i) => {
    const value = valueOf(row);
    const prev = acc[i - 1];
    const rank = prev !== undefined && value === valueOf(prev.row) ? prev.rank : i + 1;
    return [...acc, { row, rank }];
  }, []);
}

export function LeaderboardCard({
  board,
  roadmap,
}: {
  board: ProblemList | "sd" | "genai";
  roadmap: ProblemList;
}) {
  const { members, friends, categories, recent, getToken } = useData();
  const today = useToday();
  const { userName } = useShell();
  const [scope, setScope] = useLeaderboardScope();
  const isSD = board === "sd" || board === "genai";

  const [sdLeaders, setSdLeaders] = useState<SdLeader[]>([]);
  useEffect(() => {
    if (isSD) {
      api
        .sdLeaderboard(getToken, board === "genai" ? "genai" : "design")
        .then((l) => setSdLeaders(l ?? []))
        .catch(() => setSdLeaders([]));
    }
  }, [isSD, board, getToken]);

  // Carry the current scope into the full leaderboard, but keep the default out
  // of the URL so Everyone links stay clean.
  const fullHref =
    scope === DEFAULT_SCOPE
      ? paths.leaderboard()
      : `${paths.leaderboard()}?scope=${scope}`;

  const friendUsernames = new Set(friends.map((f) => f.username));
  const inScope = (name: string, username?: string) =>
    scope === "everyone" ||
    name === userName ||
    (username !== undefined && friendUsernames.has(username));

  const total = listTotal(categories, roadmap);
  const maxW = maxWeighted(categories);
  const sdTotal = board === "genai" ? GENAI_PROBLEMS.length : SD_PROBLEMS.length;

  const sdRanked = withCompetitionRanks(
    sdLeaders.filter((l) => inScope(l.name, l.username)),
    (l) => l.count,
  );
  const lcRanked = withCompetitionRanks(
    [...members]
      .filter((m) => inScope(m.name, m.username))
      .sort((a, b) => (b.solvedByList[roadmap] ?? 0) - (a.solvedByList[roadmap] ?? 0)),
    (m: Member) => m.solvedByList[roadmap] ?? 0,
  );

  const rows = isSD ? sdRanked : lcRanked;

  return (
    <EntryPoint
      to={fullHref}
      action="View full leaderboard"
      ariaLabel={`View full leaderboard — ${scope === "friends" ? "friends only" : "everyone"}`}
      className="h-full lg:col-span-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[17px] font-medium">Summer 2026 Leaderboard</div>
        <div className={`${ABOVE_STRETCH} flex items-center gap-3`}>
          <ScopeRadioGroup scope={scope} onChange={setScope} />
          <span className="text-xs text-muted-foreground">
            {isSD
              ? board === "genai"
                ? "AI System Design"
                : "System Design"
              : ROADMAP_LABEL[roadmap]}
          </span>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {isSD
          ? sdRanked.slice(0, 4).map(({ row: l, rank }) => (
              <li key={l.name}>
                <EntryPoint
                  variant="row"
                  to={paths.user(l.username ?? l.name)}
                  ariaLabel={`${l.name}, rank ${rank}, ${l.count} of ${sdTotal} modules`}
                  className={ABOVE_STRETCH}
                >
                  <div className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
                    {rank}
                  </div>
                  <div
                    className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium ${colorFor(l.name)}`}
                  >
                    {initialsOf(l.name)}
                    {rank === 1 && l.count > 0 && (
                      <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
                    )}
                  </div>
                  <div className="w-36 min-w-0">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    {l.username && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        @{l.username}
                      </div>
                    )}
                  </div>
                  <div className="hidden flex-1 sm:block">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={rank === 1 ? "h-full bg-coral" : "h-full bg-sky"}
                        style={{ width: `${sdTotal ? (l.count / sdTotal) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {l.count}
                    <span className="text-muted-foreground"> /{sdTotal}</span>
                  </div>
                </EntryPoint>
              </li>
            ))
          : lcRanked.slice(0, 4).map(({ row: m, rank }) => {
              const solved = m.solvedByList[roadmap] ?? 0;
              const tier = rankFor(m.byDiff.easy, m.byDiff.medium, m.byDiff.hard, maxW);
              // Delta since last week, composed from the /recent feed — no new
              // endpoint. Always non-negative; see lib/momentum.ts.
              const week = weeklyDelta(solvedInWindow(recent, m.name, today.key));
              return (
                <li key={m.name}>
                  <EntryPoint
                    variant="row"
                    to={paths.user(m.username ?? m.name)}
                    ariaLabel={`${m.name}, rank ${rank}, ${tier.tier} tier, ${solved} of ${total} solved, ${week.label}`}
                    className={ABOVE_STRETCH}
                  >
                    <div className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
                      {rank}
                    </div>
                    <div
                      className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium ${m.color}`}
                    >
                      {m.initials}
                      {rank === 1 && (
                        <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
                      )}
                    </div>
                    <div className="w-36 min-w-0">
                      <div className="truncate text-sm font-medium">{m.name}</div>
                      {/* Finding #5: the tier badge used to be modal-only. */}
                      {/*
                        Every row states its own status: tier badge, this
                        week's momentum, and the solved count on the right.
                        Nothing here requires a hover to learn.
                      */}
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tier.badge}`}
                        >
                          {tier.tier}
                        </span>
                        <span
                          className={`shrink-0 text-[11px] font-medium ${
                            week.active ? "text-coral" : "text-muted-foreground"
                          }`}
                        >
                          {week.active ? week.label : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="hidden flex-1 sm:block">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={rank === 1 ? "h-full bg-coral" : "h-full bg-sky"}
                          style={{ width: `${total ? (solved / total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                      {solved}
                      <span className="text-muted-foreground"> /{total}</span>
                    </div>
                  </EntryPoint>
                </li>
              );
            })}
        {rows.length === 0 && <EmptyRow scope={scope} />}
      </ul>
    </EntryPoint>
  );
}

function EmptyRow({ scope }: { scope: LeaderboardScope }) {
  return (
    <li className="py-6 text-center text-sm text-muted-foreground">
      {scope === "friends" ? "No friends on this board yet." : "No members yet."}
    </li>
  );
}
