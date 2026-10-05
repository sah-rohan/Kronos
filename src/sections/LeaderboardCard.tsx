import { Card } from "../components/Card";
import { Avatar } from "../components/Controls";
import { useData } from "../data/context";
import { useSdLeaderboard } from "../data/hooks";
import { initialsOf } from "../lib/avatar";
import { ROADMAP_LABEL, isModuleBoard, listTotal } from "../lib/roadmaps";
import { rankFor, maxWeighted, rankMembers } from "../lib/rank";
import { TRACK_LABEL, modulesFor } from "../systemdesign/catalog";
import type { Board, ProblemList } from "../types";

const TOP = 4;

type Row = { key: string; rank: number; name: string; initials: string; sub: string; count: number; dot?: string };

export function LeaderboardCard({
  onOpen,
  board,
  roadmap,
  userName,
}: {
  onOpen: () => void;
  board: Board;
  roadmap: ProblemList;
  userName: string;
}) {
  const { members, categories } = useData();
  const track = isModuleBoard(board) ? board : null;
  const sdLeaders = useSdLeaderboard(track);

  let scope: string, total: number, rows: Row[];
  if (track) {
    scope = TRACK_LABEL[track];
    total = modulesFor(track).length;
    rows = sdLeaders.slice(0, TOP).map((l, i) => ({
      key: l.name,
      rank: i + 1,
      name: l.name,
      initials: initialsOf(l.name),
      sub: l.username ? `@${l.username}` : "",
      count: l.count,
    }));
  } else {
    const maxW = maxWeighted(categories);
    scope = ROADMAP_LABEL[roadmap];
    total = listTotal(categories, roadmap);
    rows = rankMembers(members, roadmap)
      .slice(0, TOP)
      .map(({ m, rank, solved }) => ({
        key: m.name,
        rank,
        name: m.name,
        initials: m.initials,
        count: solved,
        dot: rankFor(m.byDiff, maxW).dot,
        sub: `@${m.username}`,
      }));
  }

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
              <Avatar size="sm" me={me} initials={r.initials} className="relative">
                {r.dot && <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${r.dot}`} />}
              </Avatar>
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
