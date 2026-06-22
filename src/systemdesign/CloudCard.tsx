import { Cloud } from "lucide-react";
import { Card } from "../components/Card";
import { CLOUD_DOCS } from "./cloud";

export function CloudCard({ onOpen }: { onOpen: () => void }) {
  return (
    <Card className="lg:col-span-1 h-full" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">Cloud Engineering</div>
        <Cloud className="h-4 w-4 text-coral" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Learn AWS and Azure, side by side, in depth.
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>AWS + Azure</span>
        <span>{CLOUD_DOCS.length} topics</span>
      </div>
      <ul className="mt-3 h-72 space-y-2 overflow-y-auto pr-1">
        {CLOUD_DOCS.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{c.tagline}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
