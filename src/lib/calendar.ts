import { dayKey } from "./date";
import type { Month } from "../types";

export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// The calendar can be browsed from the season start up to the current month.
export const CAL_START: Month = { year: 2026, month: 5 };
const now = new Date();
export const CAL_END: Month = { year: now.getFullYear(), month: now.getMonth() };

export const sameMonth = (a: Month, b: Month) => a.year === b.year && a.month === b.month;

// Solve counts for every day of a month, read from a per-day map.
export function monthCounts(byDate: Record<string, number>, year: number, month: number): number[] {
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => byDate[dayKey(year, month, i + 1)] ?? 0);
}

// Heat-map cell colour for a day with solves; null when there were none.
export function heatTone(count: number): string | null {
  if (count >= 3) return "bg-medium text-background";
  if (count === 2) return "bg-easy text-hard";
  if (count === 1) return "bg-sky text-hard";
  return null;
}
