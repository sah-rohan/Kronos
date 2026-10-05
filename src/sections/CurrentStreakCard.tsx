import { Card } from "../components/Card";
import { useData } from "../data/source";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function CurrentStreakCard({ onOpen }: { onOpen: () => void }) {
  const { calendar } = useData();
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const todayDate = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadPad = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const counts = Array.from({ length: daysInMonth }, (_, i) => {
    const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return calendar.byDate[k] ?? 0;
  });
  const monthTotal = counts.reduce((a, b) => a + b, 0);
  const monthName = today.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });

  return (
    <Card className="flex h-full flex-col gap-4" onClick={onOpen}>
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 font-display text-[26px] leading-tight">{monthName}</h2>
        <span className="text-[13px] text-muted-foreground">Calendar</span>
      </div>
      <div className="flex gap-7 border-t border-foreground pt-3.5">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Streak</span>
          <span className="font-display text-[34px] font-light leading-none">
            {calendar.streak}
            <span className="text-base text-muted-foreground"> {calendar.streak === 1 ? "day" : "days"}</span>
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="eyebrow">This month</span>
          <span className="font-display text-[34px] font-light leading-none">
            {monthTotal}
            <span className="text-base text-muted-foreground"> solved</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => (
          <span key={i} className="eyebrow grid aspect-square place-items-center text-[10px]">
            {d}
          </span>
        ))}
        {Array.from({ length: leadPad }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {counts.map((count, i) => {
          const day = i + 1;
          const tone =
            count >= 3
              ? "bg-medium text-background"
              : count === 2
                ? "bg-easy text-hard"
                : count === 1
                  ? "bg-sky text-hard"
                  : day > todayDate
                    ? "text-border-strong"
                    : "text-muted-foreground";
          return (
            <span
              key={day}
              title={count ? `${count} solved` : undefined}
              className={`grid aspect-square place-items-center rounded-md font-mono text-xs ${tone} ${
                day === todayDate ? "outline outline-1 outline-foreground" : ""
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </Card>
  );
}
