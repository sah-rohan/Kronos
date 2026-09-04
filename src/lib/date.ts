import { keyToLocalDate } from "./calendar";

export function fmtShortDate(value?: string): string {
  if (!value) return "";

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const d = dateOnly ? keyToLocalDate(value.trim()) : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Whole days from now until an ISO timestamp (negative if already past).
// Returns null for an empty/invalid input.
export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((t - Date.now()) / 86400000);
}
