import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Score-first summary: the number the reader came for, first and large.
 *
 * The audit's Ace comparison. Anything read at a glance leads with the primary
 * figure at display size, follows with a quiet qualifier, and offers at most one
 * affordance. Charts are for exploring; this is for answering.
 *
 * Ordering is enforced structurally rather than by convention: `value` renders
 * before `label` in the DOM, so the number is also what a screen reader reaches
 * first. There is no slot for a second action — a card with two calls to action
 * is not a score card.
 *
 * The momentum line is where "no shame" gets applied. It is a non-negative
 * count from `lib/momentum.ts` and it never renders in a failure colour: an
 * inactive week is muted, never red, because red for "behind" is the thing the
 * audit explicitly rules out.
 */
export function ScoreCard({
  value,
  label,
  qualifier,
  momentum,
  to,
  action,
  onSelect,
  emphasis = "normal",
}: {
  /** The primary figure. Rendered first, at display size. */
  value: ReactNode;
  /** What the figure counts, e.g. "solved". */
  label: string;
  /** Quiet secondary context, e.g. "NeetCode 150". */
  qualifier?: string;
  /** Momentum line — always non-negative phrasing. */
  momentum?: { label: string; active: boolean };
  /** The single affordance. `to` navigates; `onSelect` is for overlays. */
  to?: string;
  onSelect?: () => void;
  action?: string;
  /** `hero` is for the one figure a screen is about. */
  emphasis?: "normal" | "hero";
}) {
  const size = emphasis === "hero" ? "text-[52px]" : "text-[34px]";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
      {/* Value first, in the DOM as well as visually. */}
      <div className="flex items-baseline gap-2">
        <span className={`font-display ${size} leading-none tracking-tight`}>{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>

      {qualifier && (
        <div className="mt-1 text-[11px] text-muted-foreground">{qualifier}</div>
      )}

      {momentum && (
        <div
          className={`mt-2 text-xs font-medium ${
            momentum.active ? "text-coral" : "text-muted-foreground"
          }`}
        >
          {momentum.label}
        </div>
      )}

      {(to || onSelect) && action && (
        <div className="mt-auto pt-4">
          {to ? (
            <Link
              to={to}
              className="text-xs font-medium text-coral underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {action}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onSelect}
              className="text-xs font-medium text-coral underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {action}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The same score-first ordering at row scale, for per-topic summaries inside a
 * list. Count leads; the topic name and the bar are the qualifier.
 */
export function ScoreRow({
  value,
  total,
  label,
  children,
}: {
  value: number;
  total: number;
  label: string;
  children?: ReactNode;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="flex w-20 shrink-0 items-baseline gap-1">
        <span className="font-display text-2xl leading-none tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground tabular-nums">/{total}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{label}</div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-coral" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {children}
    </div>
  );
}
