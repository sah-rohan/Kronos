import { Crown, Flame } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { ROADMAP_LABEL, listTotal } from "../lib/roadmaps";
import type { ProblemList } from "../types";

export function LeaderboardCard({ onOpen, roadmap }: { onOpen: () => void; roadmap: ProblemList }) {
  const { members, categories } = useData();
  const total = listTotal(categories, roadmap);
  const ranked = [...members].sort((a, b) => (b.solvedByList[roadmap] ?? 0) - (a.solvedByList[roadmap] ?? 0));
  return (
    <Card className="lg:col-span-2" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[17px] font-medium">Summer 2026 Leaderboard</div>
        <div className="text-xs text-muted-foreground">{ROADMAP_LABEL[roadmap]}</div>
      </div>
      <ul className="mt-5 space-y-3">
        {ranked.slice(0, 4).map((m, i) => {
          const solved = m.solvedByList[roadmap] ?? 0;
          return (
            <li key={m.name} className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5">
              <div className="w-5 text-sm font-medium text-muted-foreground tabular-nums">{i + 1}</div>
              <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium ${m.color}`}>
                {m.initials}
                {i === 0 && (
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
                    className={i === 0 ? "h-full bg-coral" : "h-full bg-sky"}
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
