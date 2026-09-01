import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ABOVE_STRETCH, EntryPoint } from "../components/EntryPoint";

/**
 * The shared shape of the four curriculum cards (System Design, GenAI System
 * Design, Cloud Engineering, Networking).
 *
 * They were ~90% identical, which is why the same `closest("ul")` workaround had
 * to be written twice and why their list heights drifted apart (`h-60` vs
 * `h-72`, so the four cards in a row did not line up). One component now.
 *
 * Audit finding #6 — the nested scroll trap
 * -----------------------------------------
 * Each card used to carry a fixed-height `overflow-y-auto` list holding all
 * 10–16 topics, nested inside the page scroller. Putting the pointer over one
 * and scrolling stalled the page while a short list consumed the wheel.
 *
 * The fix follows the brief's preferred option — the page is the only scroller —
 * by showing a bounded *preview* of the curriculum rather than a scrollable copy
 * of all of it. There is no inner scroll container at all, so there is nothing to
 * trap the wheel, and the cards keep a uniform height. The complete list is one
 * click away at the index route that Phase 1 created, which is exactly what the
 * card's entry-point affordance points at.
 */

export type CurriculumItem = {
  slug: string;
  title: string;
  /** Secondary line: difficulty for modules, tagline for topics. */
  detail?: string;
  href: string;
  done?: boolean;
};

/** How many rows a card previews. Uniform across all four so the grid lines up. */
export const PREVIEW_COUNT = 5;

export function CurriculumCard({
  title,
  blurb,
  icon: Icon,
  items,
  total,
  noun,
  solvedCount,
  meta,
  indexHref,
  action,
  numbered = false,
  children,
}: {
  title: string;
  blurb: string;
  icon: LucideIcon;
  /** Already sliced to PREVIEW_COUNT by the caller. */
  items: CurriculumItem[];
  total: number;
  /** "modules" or "topics". */
  noun: string;
  /** Omitted for curricula that have no completion tracking. */
  solvedCount?: number;
  /**
   * Left-hand label for curricula without completion tracking ("AWS + Azure",
   * "Curriculum"). Without it the row would read "14 topics ... 14 topics".
   */
  meta?: string;
  indexHref: string;
  action: string;
  /** Networking is an ordered curriculum, so its preview rows are numbered. */
  numbered?: boolean;
  /** Extra content between the blurb and the list (the Components reference). */
  children?: React.ReactNode;
}) {
  const remaining = total - items.length;

  return (
    <EntryPoint
      to={indexHref}
      action={action}
      ariaLabel={`${action} — ${title}`}
      className="h-full lg:col-span-1"
    >
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">{title}</div>
        <Icon className="h-4 w-4 text-coral" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>

      {children}

      <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>
          {solvedCount !== undefined ? `${solvedCount}/${total} solved` : meta}
        </span>
        <span>
          {total} {noun}
        </span>
      </div>

      {/*
        No overflow container, no fixed height: the page is the only scroller.
        Rows are links and must sit above the card's stretched hit area.
      */}
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={item.slug}>
            <Link
              to={item.href}
              className={`${ABOVE_STRETCH} flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition hover:border-coral/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
            >
              {numbered && (
                <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                {item.detail && (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.detail}
                  </span>
                )}
              </span>
              {item.done && (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3fae6a]/15 text-[#3fae6a]">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          + {remaining} more {noun}
        </p>
      )}
    </EntryPoint>
  );
}
