// Recent-activity counts, framed as progress rather than deficit.
import { dateKey, keyToLocalDate } from "./calendar";
import type { RecentItem } from "../types";

export function recentDayKeys(today: string, days = 7): string[] {
  const cursor = keyToLocalDate(today);
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    keys.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return keys;
}

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
  count: number;
  label: string;
  active: boolean;
};

export function weeklyDelta(count: number): Momentum {
  return {
    count,
    label: count > 0 ? `+${count} this week` : "No solves yet this week",
    active: count > 0,
  };
}

export function streakLabel(days: number): string {
  if (days <= 0) return "Start a streak today";
  return `${days} day${days === 1 ? "" : "s"} in a row`;
}

export function comparisonNote(mine: number, theirs: number, who: string): string {
  if (mine === 0 && theirs === 0) return `You and ${who} are both just getting started.`;
  if (mine === theirs) return `You and ${who} are neck and neck.`;
  if (mine > theirs) return `You're ahead of ${who} right now — keep it going.`;
  return `${who} is on a run. Good week to catch up.`;
}
