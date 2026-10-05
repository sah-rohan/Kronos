// True when the (already lowercased, trimmed) query is empty or found in any field.
export const matches = (q: string, ...fields: (string | undefined)[]) =>
  !q || fields.some((f) => (f ?? "").toLowerCase().includes(q));

export const normalize = (query: string) => query.trim().toLowerCase();

// Keep each category's items that pass `keep`, dropping categories left empty.
export function filterCategories<C extends { items: unknown[] }>(cats: C[], keep: (p: C["items"][number]) => boolean): C[] {
  return cats.map((c) => ({ ...c, items: c.items.filter(keep) })).filter((c) => c.items.length > 0);
}
