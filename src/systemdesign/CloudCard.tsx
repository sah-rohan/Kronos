import { Cloud } from "lucide-react";
import { Card } from "../components/Card";
import { CLOUD_DOCS } from "./cloud";

export function CloudCard({ onOpen }: { onOpen: (id: string) => void }) { // make the id required, not optional
  return (
    // clicking on the card doesn't click on any particular topic, it just opens the card
    <Card className="lg:col-span-1 h-full" onClick={(e) => { 
      if ((e.target as HTMLElement).closest("ul")) return; // the click came from inside the topic list, so let the row's own button handle it. Also catches scrollbar drags, which target the <ul>
      onOpen(CLOUD_DOCS[0].id) // otherwise, open the module at CLOUD_DOCS[0].id
    }}>
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
          <li key={c.id}>
            <button type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral">
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
