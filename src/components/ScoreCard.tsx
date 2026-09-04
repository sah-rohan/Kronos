import type { ReactNode } from "react";
import { Link } from "react-router-dom";

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
  value: ReactNode;
  label: string;
  qualifier?: string;
  momentum?: { label: string; active: boolean };
  to?: string;
  onSelect?: () => void;
  action?: string;
  emphasis?: "normal" | "hero";
}) {
  const size = emphasis === "hero" ? "text-[52px]" : "text-[34px]";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
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
