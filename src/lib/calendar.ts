/**
 * The single source of truth for "what day is it" — audit finding #4.
 *
 * Root cause the audit reported symptoms of: there were **two** independent date
 * computations. `CurrentStreakCard` built its grid and its header from UTC
 * (`getUTCFullYear`, `getUTCMonth`, `getUTCDay`, `toLocaleDateString({timeZone:
 * "UTC"})`), while the calendar overlay built its grid from local time. For any
 * user west of Greenwich in the evening those disagree by a day, which is how a
 * header could read "Thu, August 27" to someone whose own clock said Wednesday
 * the 26th.
 *
 * Rules enforced here, so no caller has to remember them:
 *
 * - Every comparison goes through a normalized **local** `YYYY-MM-DD` key.
 * - Never `toISOString()`. It is UTC, and it silently shifts the day for
 *   roughly half the planet. `dateKey` exists specifically so nobody reaches
 *   for it.
 * - Never compare `Date` objects directly; two Dates for the same day are only
 *   equal if they are the same instant.
 *
 * Covered by `calendar.test.ts`, which pins both the clock and the timezone.
 */
import { useEffect, useState } from "react";

/** Local-time `YYYY-MM-DD`. The only date format compared anywhere. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's key, in the viewer's own timezone. */
export function todayKey(): string {
  return dateKey(new Date());
}

/** Local midnight for the day `d` falls on. */
export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Parses a `YYYY-MM-DD` key into a local-midnight Date (never UTC-parsed). */
export function keyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  // `new Date("2026-08-27")` would parse as UTC midnight; the component form
  // is unambiguously local.
  return new Date(y, m - 1, d);
}

export type GridCell = {
  /** Day of month, 1-based. */
  day: number;
  /** Local `YYYY-MM-DD`. */
  key: string;
  /** 0 = Sunday … 6 = Saturday, for grid padding. */
  weekdayIndex: number;
  isToday: boolean;
};

/**
 * The cells of one month, in order. `month` is 0-based, matching `Date`.
 *
 * Takes today's key as an argument rather than reading the clock itself, so the
 * caller supplies one consistent value to the header and the grid — that is the
 * whole point of the fix.
 */
export function monthGridCells(
  year: number,
  month: number,
  today: string,
): GridCell[] {
  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const key = dateKey(date);
    return {
      day: i + 1,
      key,
      weekdayIndex: date.getDay(),
      isToday: key === today,
    };
  });
}

/**
 * The days making up the current streak: the unbroken run of solve-days ending
 * today, or ending yesterday if nothing is solved yet today.
 *
 * Returned as keys so the calendar can style "part of your streak" differently
 * from "a day you happened to solve something", which the audit found
 * indistinguishable.
 */
export function streakKeys(
  byDate: Record<string, number>,
  today: string,
  seasonStart?: number,
): Set<string> {
  const keys = new Set<string>();
  const cursor = keyToLocalDate(today);
  // A day with no solves yet does not break a streak that ran through
  // yesterday; it just has not been extended.
  if ((byDate[dateKey(cursor)] ?? 0) === 0) {
    cursor.setDate(cursor.getDate() - 1);
  }
  const floor = seasonStart ? dateKey(new Date(seasonStart * 1000)) : "";
  while ((byDate[dateKey(cursor)] ?? 0) > 0 && dateKey(cursor) >= floor) {
    keys.add(dateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return keys;
}

/** Convenience: the streak length, derived from the same run as `streakKeys`. */
export function streakLength(
  byDate: Record<string, number>,
  today: string,
  seasonStart?: number,
): number {
  return streakKeys(byDate, today, seasonStart).size;
}

/**
 * The one `today` source. Returns a local-midnight `Date` and its key, and
 * re-evaluates when the day rolls over so a tab left open overnight does not
 * keep highlighting yesterday.
 *
 * Both the streak card's header and its grid consume this, which is what makes
 * "header says the 27th, grid highlights the 4th" structurally impossible.
 */
export function useToday(): { date: Date; key: string } {
  const [key, setKey] = useState(todayKey);

  useEffect(() => {
    // Re-check on a timer and whenever the tab is looked at again. setState in a
    // callback (not in the effect body) so no cascading render is triggered, and
    // only when the value actually changed so this is a no-op almost always.
    const check = () => setKey((prev) => (prev === todayKey() ? prev : todayKey()));
    const id = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return { date: keyToLocalDate(key), key };
}

/* -------------------------------------------------------------------------- */
/* Day states — one place that decides what a cell means                       */
/* -------------------------------------------------------------------------- */

export type DayState = "today" | "streak" | "solved" | "empty";

/**
 * Classifies a day. Order matters: "today" wins over "streak", which wins over
 * "solved", so every cell has exactly one state and the legend can be read
 * literally.
 */
export function dayState(
  key: string,
  today: string,
  count: number,
  streak: Set<string>,
): DayState {
  if (key === today) return "today";
  if (streak.has(key)) return "streak";
  if (count > 0) return "solved";
  return "empty";
}

/** Human-readable day label for `aria-label`, e.g. "August 27, 2026". */
export function formatDayLabel(key: string): string {
  return keyToLocalDate(key).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* Month arithmetic                                                            */
/* -------------------------------------------------------------------------- */

/** A calendar month. `month` is 0-based, matching `Date`. */
export type CalMonth = { year: number; month: number };

/** Comparable ordinal, so month maths never goes through Date. */
function monthOrdinal(m: CalMonth): number {
  return m.year * 12 + m.month;
}

/** The month a date falls in, in local time. */
export function monthOf(d: Date): CalMonth {
  return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * Constrains a month to `[min, max]`.
 *
 * Used to open the calendar on today's month rather than on the season start.
 * Today can legitimately sit outside the season — before it starts, or after it
 * ends — so the nearest in-range month is the sensible landing spot rather than
 * a blank grid the user cannot navigate away from.
 *
 * Compares ordinals, so a range that straddles a year boundary (Nov -> Feb)
 * behaves correctly.
 */
export function clampMonth(target: CalMonth, min: CalMonth, max: CalMonth): CalMonth {
  const t = monthOrdinal(target);
  if (t < monthOrdinal(min)) return min;
  if (t > monthOrdinal(max)) return max;
  return target;
}
