import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * The one navigation-affordance primitive.
 *
 * Audit finding #2: the app had three different ways to say "open the detail
 * view" — a whole-card click with no cue (My Progress), a row click with no cue
 * (leaderboard), and a text link that did look clickable ("See all" on Recent
 * Activity). Every one of those now routes through this component, so the cue is
 * identical everywhere: a persistent chevron and label at the trailing edge.
 *
 * How it works
 * ------------
 * The visible affordance IS the link. The card is `relative`; the link paints an
 * `::after` pseudo-element across the whole card (`absolute inset-0`), so the
 * entire card is the hit target while the accessible name comes from one
 * labelled element. That is the "stretched link" pattern, and it is why the card
 * is not an anchor wrapped around arbitrary content: wrapping would swallow
 * nested controls (a `<select>`, a row of links) into the anchor, which is
 * invalid HTML and produced the `closest("ul")` / `stopPropagation` workarounds
 * this codebase used to carry.
 *
 * Nested interactive content stays clickable by sitting above the stretched
 * layer — give it `ABOVE_STRETCH` (`relative z-10`).
 *
 * Affordance rules this enforces
 * ------------------------------
 * - The chevron and label are **persistent**, never hover-revealed: a
 *   hover-only affordance does not exist on touch, and is invisible to anyone
 *   scanning the page.
 * - `hover` and `focus-visible` share one token set (see SURFACE below), so a
 *   keyboard user sees the same state change a mouse user does, plus a ring.
 * - `cursor-pointer` falls out of this being a real anchor. It is not the
 *   affordance; the chevron and label are.
 *
 * Use `to` for navigation (renders `<Link>`: middle-click, cmd-click, right-click
 * "open in new tab", and link semantics for screen readers all work). Use
 * `onSelect` for the one case that opens an overlay instead of navigating — it
 * renders a real `<button>` so the card stays keyboard-reachable.
 */

/** Put this on any interactive child so it sits above the stretched hit area. */
export const ABOVE_STRETCH = "relative z-10";

/**
 * The shared surface. Hover and focus-visible deliberately produce the same
 * elevation change; focus additionally gets a ring. Defined once so the four
 * card types cannot drift apart.
 */
const SURFACE = [
  "group relative flex flex-col rounded-[20px] border border-border bg-card p-6",
  "shadow-[0_8px_30px_-12px_rgba(7,55,129,0.18)] backdrop-blur-md",
  "transition duration-200",
  // Hover state
  "hover:-translate-y-0.5 hover:border-coral/40 hover:shadow-[0_18px_40px_-14px_rgba(7,55,129,0.28)]",
  // Same state for keyboard focus, plus a visible ring. `has-[...]` scopes this
  // to the stretched trigger, so a nested link/button focusing does not light up
  // the whole card.
  "has-[[data-entry-trigger]:focus-visible]:-translate-y-0.5",
  "has-[[data-entry-trigger]:focus-visible]:border-coral/40",
  "has-[[data-entry-trigger]:focus-visible]:ring-2",
  "has-[[data-entry-trigger]:focus-visible]:ring-coral",
  "has-[[data-entry-trigger]:focus-visible]:ring-offset-2",
  "has-[[data-entry-trigger]:focus-visible]:ring-offset-background",
].join(" ");

/** Row variant: same idea, list-row proportions. */
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

/**
 * The stretched trigger. `after:absolute after:inset-0` is what makes the whole
 * card clickable; `outline-none` removes the default focus outline because the
 * ring is drawn on the card via `has-[...]` above.
 */
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
  /** Destination. Mutually exclusive with `onSelect`. */
  to?: string;
  /** Opens an overlay instead of navigating; renders a `<button>`. */
  onSelect?: () => void;
  /**
   * Visible label beside the chevron ("View all", "Open tracker").
   * Optional for rows, where the row's own content is the label and a bare
   * chevron is the right amount of cue.
   */
  action?: string;
  /** Fuller accessible name when the visible label alone is too terse. */
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
      {/*
        mt-auto pins the affordance to the bottom edge so it lands in the same
        place on every card regardless of content height — part of "same chevron,
        same label position" across all four.
      */}
      <div className="mt-auto pt-6">{trigger}</div>
    </div>
  );
}
