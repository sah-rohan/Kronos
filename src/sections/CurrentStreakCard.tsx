import { Calendar, Flame } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";

export function CurrentStreakCard({ onOpen }: { onOpen: () => void }) {
  const { calendar } = useData();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadPad = new Date(year, month, 1).getDay();

  const counts = Array.from({ length: daysInMonth }, (_, i) => {
    const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return calendar.byDate[k] ?? 0;
  });

  const todayLabel = today.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });

  return (
    <Card className="flex h-full flex-col lg:col-span-1" onClick={onOpen}>
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

      <div className="mt-5 flex flex-1 items-center justify-center">
        <div className="grid grid-cols-7 gap-1.5">
          {/* day grid */}
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="grid h-6 w-9 place-items-center text-[10px] font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {Array.from({ length: leadPad }, (_, i) => (
            <div key={`pad-${i}`} className="h-9 w-9" />
          ))}
          {counts.map((count, i) => {
            const tone =
              count >= 3
                ? "bg-coral text-white"
                : count === 2
                ? "bg-coral/55 text-white"
                : count === 1
                ? "bg-coral/25 text-coral"
                : "bg-muted text-muted-foreground";
            return (
              <div
                key={i}
                className={`grid h-9 w-9 place-items-center rounded-md text-[11px] font-medium ${tone}`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
