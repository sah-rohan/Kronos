import { useEffect, useState } from "react";
import { Crown, Flame } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { api, type SdLeader } from "../lib/api";
import { ROADMAP_LABEL, listTotal } from "../lib/roadmaps";
import { rankFor, maxWeighted } from "../lib/rank";
import { initialsOf, colorFor } from "../lib/avatar";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import type { ProblemList } from "../types";

export function LeaderboardCard({
  onOpen,
  board,
  roadmap,
}: {
  onOpen: () => void;
  board: ProblemList | "sd" | "genai";
  roadmap: ProblemList;
}) {
  const { members, categories, getToken } = useData();
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

  // ----- System Design / AI System Design board -----
  if (isSD) {
    const total = board === "genai" ? GENAI_PROBLEMS.length : SD_PROBLEMS.length;
    const label = board === "genai" ? "AI System Design" : "System Design";
    let lastVal: number | null = null;
    let lastRank = 0;
    const ranked = sdLeaders.map((l, i) => {
      const rank = i > 0 && l.count === lastVal ? lastRank : i + 1;
      lastVal = l.count;
      lastRank = rank;
      return { l, rank };
    });
    return (
      <Card className="lg:col-span-2 h-full" onClick={onOpen}>
        <div className="flex items-center justify-between">
          <div className="text-[17px] font-medium">Summer 2026 Leaderboard</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        <ul className="mt-5 space-y-3">
          {ranked.slice(0, 4).map(({ l, rank }) => (
            <li key={l.name} className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5">
              <div className="w-5 text-sm font-medium text-muted-foreground tabular-nums">{rank}</div>
              <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium ${colorFor(l.name)}`}>
                {initialsOf(l.name)}
                {rank === 1 && <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />}
              </div>
              <div className="w-36 min-w-0">
                <div className="truncate text-sm font-medium">{l.name}</div>
                {l.username && <div className="truncate text-[11px] text-muted-foreground">@{l.username}</div>}
              </div>
              <div className="flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={rank === 1 ? "h-full bg-coral" : "h-full bg-sky"}
                    style={{ width: `${total ? (l.count / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-right text-sm font-semibold tabular-nums">
                {l.count}
                <span className="text-muted-foreground"> /{total}</span>
              </div>
            </li>
          ))}
          {ranked.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No members yet.</li>
          )}
        </ul>
      </Card>
    );
  }

  // ----- LeetCode roadmap board -----
  const total = listTotal(categories, roadmap);
  const maxW = maxWeighted(categories);
  // Competition ranking: tied solvers share a rank (1, 2, 2, 4).
  let lastVal: number | null = null;
  let lastRank = 0;
  const ranked = [...members]
    .sort((a, b) => (b.solvedByList[roadmap] ?? 0) - (a.solvedByList[roadmap] ?? 0))
    .map((m, i) => {
      const v = m.solvedByList[roadmap] ?? 0;
      const rank = i > 0 && v === lastVal ? lastRank : i + 1;
      lastVal = v;
      lastRank = rank;
      return { m, rank };
    });
  return (
    <Card className="lg:col-span-2 h-full" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[17px] font-medium">Summer 2026 Leaderboard</div>
        <div className="text-xs text-muted-foreground">{ROADMAP_LABEL[roadmap]}</div>
      </div>
      <ul className="mt-5 space-y-3">
        {ranked.slice(0, 4).map(({ m, rank }) => {
          const solved = m.solvedByList[roadmap] ?? 0;
          return (
            <li key={m.name} className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5">
              <div className="w-5 text-sm font-medium text-muted-foreground tabular-nums">{rank}</div>
              <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium ${m.color}`}>
                {m.initials}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${rankFor(m.byDiff.easy, m.byDiff.medium, m.byDiff.hard, maxW).dot}`}
                />
                {rank === 1 && (
                  <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
                )}
              </div>
              <div className="w-36 min-w-0">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
              <div className="flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={rank === 1 ? "h-full bg-coral" : "h-full bg-sky"}
                    style={{ width: `${total ? (solved / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-right text-sm font-semibold tabular-nums">
                {solved}
                <span className="text-muted-foreground"> /{total}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
