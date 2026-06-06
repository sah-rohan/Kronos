import { Crown, Flame, TrendingUp } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";

export function LeaderboardCard({ onOpen }: { onOpen: () => void }) {
  const { members } = useData();
  return (
    <Card className="lg:col-span-2" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[17px] font-medium">Summer 2026 Leaderboard</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> This month
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        {members.slice(0, 4).map((m, i) => (
          <li key={m.name} className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5">
            <div className="w-5 text-sm font-medium text-muted-foreground tabular-nums">{i + 1}</div>
            <div className={`relative grid h-11 w-11 place-items-center rounded-full text-sm font-medium ${m.color}`}>
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
                  style={{ width: `${(m.solved / 150) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-16 text-right text-sm font-semibold tabular-nums">
              {m.solved}
              <span className="text-muted-foreground"> /150</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
