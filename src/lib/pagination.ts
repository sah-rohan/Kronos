/**
 * Pagination maths, kept out of the component file so that file exports only a
 * component (`react-refresh/only-export-components`).
 */

export const PAGE_SIZE = 25;

export type Paged<T> = {
  items: T[];
  pageCount: number;
  /**
   * The page actually rendered. A `?page=` beyond the end clamps to the last
   * page instead of rendering an empty list — deep links go stale as rows are
   * added and removed, and an empty screen looks like a bug.
   */
  safePage: number;
};

export function paginate<T>(rows: T[], page: number, size = PAGE_SIZE): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * size;
  return { items: rows.slice(start, start + size), pageCount, safePage };
}
