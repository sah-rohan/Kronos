import { keyToLocalDate } from "./calendar";

/**
 * Formats either a `YYYY-MM-DD` date key or a full ISO timestamp as a short
 * human label like "Jun 9", in the viewer's own timezone.
 *
 * Two bugs fixed here, both in the same family as audit finding #4:
 *
 * 1. It used to split on "-" and coerce the parts with Number, so a full ISO
 *    timestamp ("2026-08-27T01:30:00Z") produced NaN for the day and the
 *    function silently returned "". Every activity list passes a timestamp, so
 *    all of them rendered blank dates.
 * 2. It formatted in UTC. The calendar now keys days in local time, so a UTC
 *    label could name a different day than the cell it described.
 *
 * Date-only keys are parsed as local midnight (never `new Date("YYYY-MM-DD")`,
 * which parses as UTC); timestamps are parsed as instants and rendered local.
 */
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
