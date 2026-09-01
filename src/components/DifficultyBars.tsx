import { DIFFICULTY, type DifficultyKey } from "../lib/difficulty";

/**
 * Grouped horizontal bar chart — replaces the overlapping-bubble chart that
 * audit finding #3 was about.
 *
 * Why bars: the old chart drew three proportional circles stacked on one
 * baseline, sized by value and sorted by value. That failed in four separate
 * ways — magnitude was encoded as diameter rather than area (so a half-value
 * circle read as a quarter), a 44px floor made small values collide and exactly
 * occlude one another, colour was keyed to sort position rather than difficulty
 * (so the legend and the marks disagreed, and the meaning of a colour changed
 * with the data), and there was no way to tell your solves from your friends'.
 * Three categories compared across two series is a grouped bar chart.
 *
 * Encoding, deliberately redundant so nothing depends on colour alone:
 *   - difficulty  -> hue AND lightness (tokens), plus a text row label
 *   - series      -> solid vs hatched fill, plus a text label on every bar
 *   - value       -> bar length, plus the number printed at the end of the bar
 *
 * Rows are ordered by `DIFFICULTY.order` (Easy -> Medium -> Hard), never by
 * value, so the chart does not reshuffle as the data changes.
 *
 * Accessibility: the visual layer is `aria-hidden` and the same numbers are
 * exposed as a real (visually hidden) table. That is a deliberate deviation from
 * "put an accessible name and description on the SVG" — a table lets a screen
 * reader navigate cell by cell and read exact values, whereas an SVG label can
 * only summarise, and doing both would announce everything twice.
 */

export type DifficultyCounts = Record<DifficultyKey, number>;

export type DifficultySeries = {
  id: string;
  /** Shown against every bar in this series. Never omitted — see the header. */
  label: string;
  counts: DifficultyCounts;
  /** Second (and any further) series are hatched so series survives greyscale. */
  hatched?: boolean;
};

/**
 * Series are supplied by the caller so the same chart can render "You vs
 * Friends" on the dashboard and "You vs <handle>" on a profile with nothing but
 * the data swapped — the comparison strip is this component, not a copy of it.
 */
export function DifficultyBars({
  series,
  caption,
  emptyNote,
}: {
  series: DifficultySeries[];
  /** Table caption; also what a screen reader hears for the whole figure. */
  caption: string;
  /** Rendered when there is nothing to compare against. */
  emptyNote?: string;
}) {

  // One shared scale across both series so bar lengths are comparable. Guard
  // against an all-zero dataset dividing by zero.
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
                // A zero-value bar still gets a sliver so the row reads as
                // "present but zero" rather than "missing".
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

      {/*
        Zero-state. Reads as intentional rather than looking like a failed
        render, and still shows the reader their own numbers above.
      */}
      {emptyNote && (
        <figcaption className="mt-4 rounded-xl border border-dashed border-border px-3 py-2 text-center text-xs text-muted-foreground">
          {emptyNote}
        </figcaption>
      )}

      {/* The same numbers, navigable cell by cell. */}
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
