/**
 * Standard page heading for a route.
 *
 * Replaces the title bar that `Modal` used to draw. The key difference is the
 * back affordance: a modal had an `onBack` callback that popped local state,
 * whereas a page has a real ancestor URL, so `backTo` is a `<Link>` and works
 * on a cold load of a deep link — where a callback would have had nothing to
 * pop.
 */
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = "Back",
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Ancestor URL. Omit on a top-level page. */
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-coral"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && (
            <div className="mt-1.5 text-sm text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
