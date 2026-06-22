import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type Option = { id: string; label: string };

// A compact dropdown styled like the Recent Activity person picker, but for
// plain labeled options (no avatars). Used to switch the leaderboard board.
export function OptionPicker({
  options,
  value,
  onSelect,
  className = "",
}: {
  options: Option[];
  value: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3.5 py-3 text-left text-sm outline-none transition hover:border-coral"
      >
        <span className="min-w-0 flex-1 truncate font-medium">{current?.label ?? "Select"}</span>
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
            <div className="max-h-64 overflow-y-auto">
              {options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    onSelect(o.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-muted ${
                    o.id === value ? "bg-muted" : ""
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
