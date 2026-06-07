import { Calendar, Flame } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CurrentStreakCard({ onOpen }: { onOpen: () => void }) {
  const { calendar } = useData();
  const today = new Date();
  const cells = Array.from({ length: 7 * 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (7 * 14 - 1 - i));
    return calendar.byDate[key(d)] ?? 0;
  });
  const todayLabel = today.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });

  return (
    <Card className="lg:col-span-1" onClick={onOpen}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-coral" /> Current Streak
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="font-display text-[56px] leading-none tracking-tight">{calendar.streak}</div>
            <div className="text-sm text-muted-foreground">day streak</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> {todayLabel}
        </div>
      </div>

      <div className="mt-6 grid gap-1.5" style={{ gridTemplateColumns: "repeat(14, minmax(0,1fr))" }}>
        {cells.map((count, i) => (
          <div
            key={i}
            className={`aspect-square rounded-[4px] ${
              count >= 3 ? "bg-coral" : count === 2 ? "bg-sky" : count === 1 ? "bg-sky/40" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </Card>
  );
}
