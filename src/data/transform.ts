import { colorFor, initialsOf } from "../lib/avatar";
import { utcDayKey } from "../lib/date";
import type { ApiCalendarProblem, ApiDay, ApiProblem } from "../lib/api";
import type { CalendarProblem, Category, Diff, Person, Problem } from "../types";

export type CalendarData = {
  byDate: Record<string, number>;
  byDateProblems: Record<string, CalendarProblem[]>;
};

export const toPerson = (name: string): Person => ({ name, initials: initialsOf(name), color: colorFor(name) });

// Group API problems by category, keeping the API's category order.
export function toCategories(rows: ApiProblem[], keep: (p: ApiProblem) => boolean = () => true): Category[] {
  const map = new Map<string, Problem[]>();
  for (const p of rows) {
    if (!keep(p)) continue;
    let items = map.get(p.category);
    if (!items) map.set(p.category, (items = []));
    items.push({
      name: p.title,
      slug: p.slug,
      diff: p.difficulty as Diff,
      done: p.done,
      optimal: p.optimal,
      blind75: p.blind75,
      neetcode150: p.neetcode150,
      neetcode250: p.neetcode250,
    });
  }
  return [...map].map(([title, items]) => ({ title, items }));
}

export function toCalendar(days: ApiDay[], problems: ApiCalendarProblem[]): CalendarData {
  const byDate: Record<string, number> = {};
  for (const d of days) byDate[d.date] = d.count;
  const byDateProblems: Record<string, CalendarProblem[]> = {};
  for (const p of problems) (byDateProblems[p.date] ??= []).push({ slug: p.slug, name: p.title, diff: p.difficulty });
  return { byDate, byDateProblems };
}

// Consecutive days with a solve, ending today (or yesterday, if nothing yet
// today), never counting days before the season started.
export function computeStreak(byDate: Record<string, number>, seasonStart?: number): number {
  const d = new Date();
  if (!byDate[utcDayKey(d)]) d.setUTCDate(d.getUTCDate() - 1);
  const floor = seasonStart ? utcDayKey(new Date(seasonStart * 1000)) : "";
  let streak = 0;
  for (let k = utcDayKey(d); byDate[k] > 0 && k >= floor; k = utcDayKey(d)) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}
