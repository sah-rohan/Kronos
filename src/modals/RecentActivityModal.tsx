import { Modal } from "../components/Modal";
import { AvatarStack } from "../components/AvatarStack";
import { useData } from "../data/source";
import { diffStyles } from "../data/problems";

export function RecentActivityModal({ onClose }: { onClose: () => void }) {
  const { recent } = useData();
  return (
    <Modal title="Recent Activity" onClose={onClose}>
      <ul className="divide-y divide-border">
        {recent.map((r) => (
          <li key={r.n} className="flex items-center gap-4 py-3">
            <div className="w-10 text-xs text-muted-foreground tabular-nums">#{r.n}</div>
            <div className="min-w-0 flex-1 truncate text-sm">{r.name}</div>
            <div className="w-20 shrink-0">
              <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}>
                {r.diff}
              </span>
            </div>
            <div className="flex w-40 justify-end">
              <AvatarStack who={r.who} cap={3} />
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
