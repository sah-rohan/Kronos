import type { Person } from "../types";

export function Avatar({ person, size = 28 }: { person: Person; size?: number }) {
  return (
    <div className="group/av relative inline-flex" style={{ width: size, height: size }}>
      <div
        className={`stack-ring flex h-full w-full items-center justify-center rounded-full text-[11px] font-bold tracking-tight ${person.color}`}
      >
        {person.initials}
      </div>
      <span className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-foreground px-2.5 py-1 text-[11px] font-medium text-background opacity-0 shadow-lg transition group-hover/av:opacity-100">
        {person.name}
      </span>
    </div>
  );
}
