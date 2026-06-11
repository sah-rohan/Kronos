import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export type PickerOption = {
  id: string;
  name: string;
  initials: string;
  color: string;
  username?: string;
};

// A compact, searchable dropdown of people. Used to switch whose data is shown.
export function PersonPicker({
  options,
  value,
  onSelect,
  className = "",
}: {
  options: PickerOption[];
  value: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const current = options.find((o) => o.id === value);
  const filtered = options.filter(
    (o) => !q || o.name.toLowerCase().includes(q) || (o.username ?? "").toLowerCase().includes(q),
  );

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-left text-sm outline-none transition hover:border-coral"
      >
        {current && (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-medium ${current.color}`}>
            {current.initials}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{current?.name ?? "Select"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onMouseDown={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute z-[70] mt-1.5 w-full rounded-xl border border-border bg-background p-1.5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="relative mb-1.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg border border-border bg-transparent py-1.5 pl-8 pr-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-coral"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    onSelect(o.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-muted ${
                    o.id === value ? "bg-muted" : ""
                  }`}
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-medium ${o.color}`}>
                    {o.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{o.name}</span>
                  {o.username && <span className="shrink-0 truncate text-xs text-muted-foreground">@{o.username}</span>}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">No match for “{query}”.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
