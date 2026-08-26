import { Network } from "lucide-react";
import { Card } from "../components/Card";
import { NETWORKING_DOCS } from "./networking";

export function NetworkingCard({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <Card className="lg:col-span-1 h-full">
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">Networking</div>
        <Network className="h-4 w-4 text-coral" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        From packets to VPCs, security groups, and the edge.
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Curriculum</span>
        <span>{NETWORKING_DOCS.length} topics</span>
      </div>
      <ul className="mt-3 h-72 space-y-2 overflow-y-auto pr-1">
        {NETWORKING_DOCS.map((c, i) => (
          <li key={c.id}>
            <button type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral">
              <div className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</div>
                <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{c.tagline}</div>
            </div>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
