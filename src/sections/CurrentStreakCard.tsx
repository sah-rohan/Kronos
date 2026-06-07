import { Calendar, Flame } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";

const WEEKS = 14;

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CurrentStreakCard({ onOpen }: { onOpen: () => void }) {
  const { calendar } = useData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

  const cells = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + day);
      cells.push({ future: d > today, count: calendar.byDate[key(d)] ?? 0 });
    }
  }

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

      <div
        className="mt-6 grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${WEEKS}, minmax(0,1fr))`,
          gridTemplateRows: "repeat(7, auto)",
          gridAutoFlow: "column",
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg ${
              cell.future
                ? "bg-transparent"
                : cell.count >= 3
                ? "bg-coral"
                : cell.count === 2
                ? "bg-coral/55"
                : cell.count === 1
                ? "bg-coral/25"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </Card>
  );
}
