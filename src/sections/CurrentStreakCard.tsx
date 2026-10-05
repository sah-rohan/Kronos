import { Calendar, Flame } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";

export function CurrentStreakCard({ onOpen }: { onOpen: () => void }) {
  const { calendar } = useData();
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadPad = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const counts = Array.from({ length: daysInMonth }, (_, i) => {
    const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return calendar.byDate[k] ?? 0;
  });

  const todayLabel = today.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <Card className="flex h-full flex-col lg:col-span-1" onClick={onOpen}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="m-0 font-display text-[26px] leading-tight">This month</h2>
          <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-accent" /> {calendar.streak}-day streak
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
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
                ? "bg-medium text-background"
                : count === 2
                ? "bg-easy text-hard"
                : count === 1
                ? "bg-sky text-hard"
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
