import { Card } from "../components/Card";
import { useData } from "../data/source";
import { diffStyles } from "../data/problems";

export function RecentActivityCard({ onOpen }: { onOpen: () => void }) {
  const { recent } = useData();
  return (
    <Card className="lg:col-span-1" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">Recent Activity</div>
        <span className="text-xs text-muted-foreground">See all</span>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {recent.slice(0, 5).map((r) => (
          <li key={r.n} className="flex items-center gap-4 py-3.5">
            <div className="w-10 text-xs text-muted-foreground tabular-nums">#{r.n}</div>
            <div className="min-w-0 flex-1 truncate text-sm">{r.name}</div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}>
              {r.diff}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
