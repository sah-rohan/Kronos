import { Card } from "../components/Card";
import { useData } from "../data/source";

export function MyProgressCard({ onOpen }: { onOpen: () => void }) {
  const { solved, total, difficultyBars } = useData();
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return (
    <Card className="lg:col-span-1" onClick={onOpen}>
      <div className="text-[15px] font-medium">My Progress</div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-[40px] leading-none tracking-tight">{solved}</div>
        <div className="text-sm text-muted-foreground">/ {total} solved</div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-coral" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-6 space-y-4">
        {difficultyBars.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                {s.label}
              </span>
              <span className="font-medium tabular-nums">
                {s.done}
                <span className="text-muted-foreground"> / {s.total}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${s.color}`} style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
