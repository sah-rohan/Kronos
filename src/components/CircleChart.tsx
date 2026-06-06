export function CircleChart({
  data,
  size = 200,
}: {
  data: { label: string; val: number }[];
  size?: number;
}) {
  const sorted = [...data].sort((a, b) => b.val - a.val);
  const max = sorted[0]?.val || 1;
  const shades = ["bg-coral/15", "bg-coral/30", "bg-coral/50", "bg-coral/70", "bg-coral"];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {sorted.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${shades[Math.min(i, shades.length - 1)]}`} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-semibold text-foreground">{d.val}</span>
          </div>
        ))}
      </div>
      <div className="relative mx-auto" style={{ height: size, width: size }}>
        {sorted.map((d, i) => {
          const ring = Math.max((d.val / max) * size, 44);
          return (
            <div
              key={d.label}
              title={`${d.label}: ${d.val}`}
              className={`group/ring absolute left-1/2 -translate-x-1/2 cursor-default rounded-full transition hover:brightness-105 ${shades[Math.min(i, shades.length - 1)]}`}
              style={{ width: ring, height: ring, bottom: 0 }}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background opacity-0 shadow-lg transition group-hover/ring:opacity-100">
                {d.label}: {d.val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
