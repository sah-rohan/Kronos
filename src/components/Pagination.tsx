import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Page controls for `?page=`.
 *
 * Renders nothing for a single page, so callers can mount it unconditionally.
 * Page changes go through `usePageParam`, which drops `page=1` from the URL so
 * the first page stays a clean address.
 */
export function Pagination({
  page,
  pageCount,
  onPage,
  total,
}: {
  page: number;
  pageCount: number;
  onPage: (next: number) => void;
  total: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4"
    >
      <span className="text-xs text-muted-foreground tabular-nums">
        Page {page} of {pageCount} · {total} total
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
