// Kept out of the component file so that file exports only a component
export const PAGE_SIZE = 25;

export type Paged<T> = {
  items: T[];
  pageCount: number;
  safePage: number;
};

export function paginate<T>(rows: T[], page: number, size = PAGE_SIZE): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * size;
  return { items: rows.slice(start, start + size), pageCount, safePage };
}
