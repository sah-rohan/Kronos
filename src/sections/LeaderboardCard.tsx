import { useEffect, useState, type ReactNode } from "react";
import { Flame } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { api, type SdLeader } from "../lib/api";
import { ROADMAP_LABEL, listTotal } from "../lib/roadmaps";
import { rankFor, maxWeighted, rankMembers } from "../lib/rank";
import { initialsOf } from "../lib/avatar";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import type { ProblemList } from "../types";

type Row = { key: string; rank: number; name: string; initials: string; sub: ReactNode; count: number; dot?: string };

function Board({
  scope,
  rows,
  total,
  userName,
  onOpen,
}: {
  scope: string;
  rows: Row[];
  total: number;
  userName: string;
  onOpen: () => void;
}) {
  return (
    <Card className="h-full lg:col-span-2" onClick={onOpen}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="m-0 font-display text-[26px] leading-tight">Summer 2026 leaderboard</h2>
        <span className="text-[13px] text-muted-foreground">{scope} · View all</span>
      </div>
      <ul className="m-0 list-none p-0">
        {rows.map((r) => {
          const me = r.name === userName;
          return (
            <li
              key={r.key}
              className={`flex items-center gap-4 border-t py-3.5 ${
                me ? "-mx-3 rounded-lg border-transparent bg-muted px-3" : "border-border"
              }`}
            >
              <span className="w-6 font-display text-xl text-muted-foreground tabular-nums">{r.rank}</span>
              <span
                className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium ${
                  me ? "bg-ink text-ink-foreground" : "bg-border-strong text-foreground"
                }`}
              >
                {r.initials}
                {r.dot && <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${r.dot}`} />}
              </span>
              <span className="min-w-0 flex-1 sm:w-52 sm:flex-none">
                <span className="block truncate text-[15px] font-medium">{r.name}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{me ? "you" : r.sub}</span>
              </span>
              <span className="hidden h-[3px] flex-1 overflow-hidden rounded-sm bg-border sm:block">
                <span
                  className={`block h-full ${r.rank === 1 ? "bg-accent" : me ? "bg-ink" : "bg-muted-foreground"}`}
                  style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
                />
              </span>
              <span className="w-16 text-right font-mono text-sm tabular-nums">
                {r.count}
                <span className="text-muted-foreground">/{total}</span>
              </span>
            </li>
          );
        })}
        {rows.length === 0 && <li className="border-t border-border py-6 text-sm text-muted-foreground">No members yet.</li>}
      </ul>
    </Card>
  );
}

export function LeaderboardCard({
  onOpen,
  board,
  roadmap,
  userName,
}: {
  onOpen: () => void;
  board: ProblemList | "sd" | "genai";
  roadmap: ProblemList;
  userName: string;
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

  if (isSD) {
    return (
      <Board
        scope={board === "genai" ? "AI System Design" : "System Design"}
        total={board === "genai" ? GENAI_PROBLEMS.length : SD_PROBLEMS.length}
        userName={userName}
        onOpen={onOpen}
        rows={sdLeaders.slice(0, 4).map((l, i) => ({
          key: l.name,
          rank: i + 1,
          name: l.name,
          initials: initialsOf(l.name),
          sub: l.username ? `@${l.username}` : "",
          count: l.count,
        }))}
      />
    );
  }

  const maxW = maxWeighted(categories);
  return (
    <Board
      scope={ROADMAP_LABEL[roadmap]}
      total={listTotal(categories, roadmap)}
      userName={userName}
      onOpen={onOpen}
      rows={rankMembers(members, roadmap)
        .slice(0, 4)
        .map(({ m, rank, solved }) => ({
          key: m.name,
          rank,
          name: m.name,
          initials: m.initials,
          count: solved,
          dot: rankFor(m.byDiff.easy, m.byDiff.medium, m.byDiff.hard, maxW).dot,
          sub:
            m.streak != null ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3 w-3 text-accent" />
                {m.streak}-day streak
              </span>
            ) : (
              `@${m.username}`
            ),
        }))}
    />
  );
}
