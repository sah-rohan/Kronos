/**
 * Momentum: recent-activity counts, framed as progress rather than deficit.
 *
 * Composed entirely from endpoints `src/lib/api.ts` already exposes — no new API
 * surface. Weekly counts come from the `/recent` feed (`who` names + `at`
 * timestamps); streaks come from a calendar (`/me/calendar` or
 * `/friends/:id/calendar`) through the same `streakKeys` the calendar UI uses.
 *
 * The framing rule, and why it is enforced in code rather than left to each
 * caller: comparison between people is shown as *momentum*, never as a shortfall.
 * There is deliberately no "behind by N" here and no way to ask for one. A
 * delta is a non-negative count of what someone did; when it is zero the caller
 * gets a neutral phrase, not a negative number. That is why `weeklyDelta`
 * returns `{ count, label }` instead of a signed integer — a signed integer
 * invites a red minus sign somewhere down the line.
 */
import { dateKey, keyToLocalDate } from "./calendar";
import type { RecentItem } from "../types";

/** The last `days` local date keys, most recent first, including today. */
export function recentDayKeys(today: string, days = 7): string[] {
  const cursor = keyToLocalDate(today);
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    keys.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return keys;
}

/**
 * How many problems `name` solved in the last `days` days, according to the
 * activity feed.
 *
 * NOTE: `/recent` is a bounded feed, so for a very active group this can
 * undercount. It is the only per-person time-series the API exposes for people
 * who are not your friends, so it is what the leaderboard delta is built from.
 * Flagged in FOLLOWUPS.md.
 */
export function solvedInWindow(
  recent: RecentItem[],
  name: string,
  today: string,
  days = 7,
): number {
  const window = new Set(recentDayKeys(today, days));
  let n = 0;
  for (const row of recent) {
    if (!row.at) continue;
    if (!row.who.some((p) => p.name === name)) continue;
    const at = new Date(row.at);
    if (Number.isNaN(at.getTime())) continue;
    if (window.has(dateKey(at))) n++;
  }
  return n;
}

export type Momentum = {
  /** Always >= 0. There is no negative momentum. */
  count: number;
  /** Ready-to-render phrase, e.g. "+3 this week" or "No solves yet this week". */
  label: string;
  /** True when there is something to celebrate; drives emphasis, not colour. */
  active: boolean;
};

/**
 * A week's activity as a non-negative, self-describing figure.
 *
 * Deliberately never expresses a comparison against anyone else. Two people's
 * momentum can sit side by side and the reader draws their own conclusion; the
 * UI does not tell someone they are losing.
 */
export function weeklyDelta(count: number): Momentum {
  return {
    count,
    label: count > 0 ? `+${count} this week` : "No solves yet this week",
    active: count > 0,
  };
}

/**
 * Phrasing for a streak. Zero reads as an invitation, not a failure — the
 * Duolingo/Strava lesson the audit cites.
 */
export function streakLabel(days: number): string {
  if (days <= 0) return "Start a streak today";
  return `${days} day${days === 1 ? "" : "s"} in a row`;
}

/**
 * Copy for a you-vs-them comparison. Every branch is neutral or encouraging;
 * none of them tells the reader they are behind.
 */
export function comparisonNote(mine: number, theirs: number, who: string): string {
  if (mine === 0 && theirs === 0) return `You and ${who} are both just getting started.`;
  if (mine === theirs) return `You and ${who} are neck and neck.`;
  if (mine > theirs) return `You're ahead of ${who} right now — keep it going.`;
  // The one case that could shame, phrased as an opportunity instead. Note it
  // still never states the size of the gap.
  return `${who} is on a run. Good week to catch up.`;
}
