// System Design completion is stored locally for now (standalone feature).
const KEY = "kronos.sd.completed";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function isCompleted(slug: string): boolean {
  return read().includes(slug);
}

export function completedCount(): number {
  return read().length;
}

export function markCompleted(slug: string): void {
  const cur = read();
  if (!cur.includes(slug)) localStorage.setItem(KEY, JSON.stringify([...cur, slug]));
}
