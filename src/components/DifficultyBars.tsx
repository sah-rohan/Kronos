import { DIFFICULTY, type DifficultyKey } from "../lib/difficulty";

export type DifficultyCounts = Record<DifficultyKey, number>;

export type DifficultySeries = {
  id: string;
  // Shown against every bar in this series. Never omitted — see the header.
  label: string;
  counts: DifficultyCounts;
  // Second (and any further) series are hatched so series survives greyscale.
  hatched?: boolean;
};

export function DifficultyBars({
  series,
  caption,
  emptyNote,
}: {
  series: DifficultySeries[];
  caption: string;
  emptyNote?: string;
}) {

  // One shared scale across both series so bar lengths are comparable. Guard against an all-zero dataset dividing by zero.
  const max = Math.max(
    1,
    ...DIFFICULTY.flatMap((d) => series.map((s) => s.counts[d.key])),
  );


  return (
    <figure className="m-0">
      <div aria-hidden="true" className="space-y-4">
        {DIFFICULTY.map((d) => (
          <div key={d.key}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-xs font-medium">{d.label}</span>
            </div>
            <div className="space-y-1">
              {series.map((s) => {
                const value = s.counts[d.key];
                // A zero-value bar still gets a sliver so the row reads as "present but zero" rather than "missing".
                const pct = value === 0 ? 0 : Math.max(4, (value / max) * 100);
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 truncate text-[10px] text-muted-foreground">
                      {s.label}
                    </span>
                    <div className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full bg-${d.token} ${s.hatched ? "series-hatch" : ""}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-7 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {emptyNote && (
        <figcaption className="mt-4 rounded-xl border border-dashed border-border px-3 py-2 text-center text-xs text-muted-foreground">
          {emptyNote}
        </figcaption>
      )}

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Difficulty</th>
            {series.map((s) => (
              <th key={s.id} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIFFICULTY.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              {series.map((s) => (
                <td key={s.id}>{s.counts[d.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
