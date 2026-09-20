// The one navigation-affordance primitive: a persistent chevron and label at the trailing edge.
// Stretched-link pattern — the link paints an ::after across the whole card, so the card is the hit
// target without wrapping it in an anchor. Nested interactive content needs ABOVE_STRETCH to stay clickable.
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/// Put this on any interactive child so it sits above the stretched hit area.
export const ABOVE_STRETCH = "relative z-10";

const SURFACE = [
  "group relative flex flex-col rounded-[20px] border border-border bg-card p-6",
  "shadow-[0_8px_30px_-12px_rgba(7,55,129,0.18)] backdrop-blur-md",
  "transition duration-200",
  "hover:-translate-y-0.5 hover:border-coral/40 hover:shadow-[0_18px_40px_-14px_rgba(7,55,129,0.28)]",
  "has-[[data-entry-trigger]:focus-visible]:-translate-y-0.5",
  "has-[[data-entry-trigger]:focus-visible]:border-coral/40",
  "has-[[data-entry-trigger]:focus-visible]:ring-2",
  "has-[[data-entry-trigger]:focus-visible]:ring-coral",
  "has-[[data-entry-trigger]:focus-visible]:ring-offset-2",
  "has-[[data-entry-trigger]:focus-visible]:ring-offset-background",
].join(" ");

const ROW_SURFACE = [
  "group relative flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5",
  "transition duration-200",
  "hover:border-coral/40 hover:bg-muted",
  "has-[[data-entry-trigger]:focus-visible]:border-coral/40",
  "has-[[data-entry-trigger]:focus-visible]:bg-muted",
  "has-[[data-entry-trigger]:focus-visible]:ring-2",
  "has-[[data-entry-trigger]:focus-visible]:ring-coral",
  "has-[[data-entry-trigger]:focus-visible]:ring-offset-2",
  "has-[[data-entry-trigger]:focus-visible]:ring-offset-background",
].join(" ");

const TRIGGER =
  "inline-flex items-center gap-1.5 text-sm font-medium text-coral outline-none transition group-hover:gap-2.5 after:absolute after:inset-0 after:content-['']";

export function EntryPoint({
  to,
  onSelect,
  action,
  ariaLabel,
  variant = "card",
  className = "",
  children,
}: {
  to?: string;
  // Opens an overlay instead of navigating; renders a `<button>`
  onSelect?: () => void;
  action?: string;
  ariaLabel?: string;
  variant?: "card" | "row";
  className?: string;
  children: ReactNode;
}) {
  const isRow = variant === "row";

  const affordance = (
    <>
      {action && <span>{action}</span>}
      <ChevronRight className="h-4 w-4 shrink-0" />
    </>
  );

  const trigger = to ? (
    <Link
      to={to}
      data-entry-trigger
      aria-label={ariaLabel}
      className={`${TRIGGER} ${isRow ? "text-muted-foreground" : ""}`}
    >
      {affordance}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onSelect}
      data-entry-trigger
      aria-label={ariaLabel}
      className={`${TRIGGER} ${isRow ? "text-muted-foreground" : ""}`}
    >
      {affordance}
    </button>
  );

  if (isRow) {
    return (
      <div className={`${ROW_SURFACE} ${className}`}>
        {children}
        <div className="ml-auto shrink-0">{trigger}</div>
      </div>
    );
  }

  return (
    <div className={`${SURFACE} ${className}`}>
      {children}
      <div className="mt-auto pt-6">{trigger}</div>
    </div>
  );
}
