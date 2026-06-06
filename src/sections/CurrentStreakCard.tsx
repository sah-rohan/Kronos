import { Calendar, Flame } from "lucide-react";
import { Card } from "../components/Card";

const heat = Array.from({ length: 7 * 14 }, (_, i) => {
  const r = (i * 9301 + 49297) % 233280;
  const v = r / 233280;
  if (v > 0.78) return "coral";
  if (v > 0.5) return "sky";
  if (v > 0.3) return "soft";
  return "empty";
});

export function CurrentStreakCard({ onOpen }: { onOpen: () => void }) {
  return (
    <Card className="lg:col-span-1" onClick={onOpen}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-coral" /> Current Streak
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="font-display text-[56px] leading-none tracking-tight">13</div>
            <div className="text-sm text-muted-foreground">day streak</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> Tue, December 19
        </div>
      </div>

      <div className="mt-6 grid gap-1.5" style={{ gridTemplateColumns: "repeat(14, minmax(0,1fr))" }}>
        {heat.map((h, i) => (
          <div
            key={i}
            className={`aspect-square rounded-[4px] ${
              h === "coral"
                ? "bg-coral"
                : h === "sky"
                ? "bg-sky"
                : h === "soft"
                ? "bg-sky/40"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </Card>
  );
}
