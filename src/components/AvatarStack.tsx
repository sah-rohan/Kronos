import { Avatar } from "./Avatar";
import type { Person } from "../types";

export function AvatarStack({ who, cap }: { who: Person[]; cap: number }) {
  const shown = who.slice(0, cap);
  const rest = who.slice(cap);
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((p) => (
        <Avatar key={p.name + p.initials} person={p} />
      ))}
      {rest.length > 0 && (
        <span
          title={rest.map((p) => p.name).join(", ")}
          className="count-chip inline-flex h-7 items-center justify-center rounded-full px-2 text-[11px] font-semibold"
        >
          +{rest.length}
        </span>
      )}
    </div>
  );
}
