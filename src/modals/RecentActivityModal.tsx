import { Modal } from "../components/Modal";
import { AvatarStack } from "../components/AvatarStack";
import { useData } from "../data/source";
import { diffStyles } from "../data/problems";
import type { ProblemRef } from "../types";

export function RecentActivityModal({
  onClose,
  userName,
  onOpenProblem,
}: {
  onClose: () => void;
  userName: string;
  onOpenProblem: (p: ProblemRef) => void;
}) {
  const { recent } = useData();
  const mine = recent.filter((r) => r.who.some((p) => p.name === userName));
  return (
    <Modal title="Recent Activity" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Your latest solves. Tap a row to see your solution.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {mine.length === 0 && (
          <li className="py-6 text-sm text-muted-foreground">No solves yet this season.</li>
        )}
        {mine.map((r) => {
          const others = r.who.filter((p) => p.name !== userName);
          return (
            <li key={r.n} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">#{r.n}</div>
                <div className="min-w-0 flex-1 text-sm">{r.name}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}>
                  {r.diff}
                </span>
                {others.length > 0 && <AvatarStack who={others} cap={3} />}
                <button
                  onClick={() => onOpenProblem({ name: r.name, slug: r.slug, diff: r.diff })}
                  className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                >
                  Solutions
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
