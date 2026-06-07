import { Crown, Flame } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";

export function LeaderboardModal({ onClose }: { onClose: () => void }) {
  const { members } = useData();
  return (
    <Modal title="Summer 2026 Leaderboard" onClose={onClose}>
      <ul className="space-y-3">
        {members.map((m, i) => (
          <li key={m.name} className="flex items-center gap-5 rounded-2xl border border-border px-5 py-4">
            <div className="w-6 text-base font-medium text-muted-foreground tabular-nums">{i + 1}</div>
            <div className={`relative grid h-12 w-12 place-items-center rounded-full text-sm font-medium ${m.color}`}>
              {m.initials}
              {i === 0 && (
                <Crown className="absolute -top-3 -right-2 h-5 w-5 rotate-12 fill-[#f5c26b] text-[#f5c26b]" />
              )}
            </div>
            <div className="w-44 min-w-0">
              <div className="truncate text-[15px] font-medium">{m.name}</div>
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
            <div className="flex-1">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={i === 0 ? "h-full bg-coral" : "h-full bg-sky"}
                  style={{ width: `${(m.solved / 150) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-20 text-right text-base font-semibold tabular-nums">
              {m.solved}
              <span className="text-sm text-muted-foreground"> /150</span>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
