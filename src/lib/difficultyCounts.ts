/**
 * Difficulty tallies, composed from what `src/lib/api.ts` already returns.
 *
 * Shared by the dashboard's You-vs-Friends chart and a profile's You-vs-them
 * comparison strip, so both count the same way. No new endpoints.
 */
import { DIFFICULTY, difficultyFor, type DifficultyKey } from "./difficulty";
import type { Category, Member } from "../types";

export type DifficultyCounts = Record<DifficultyKey, number>;

export const ZERO_COUNTS: DifficultyCounts = { easy: 0, medium: 0, hard: 0 };

/**
 * Solved-by-difficulty across every category in a problem list.
 *
 * Counts the whole catalog rather than a single track, because the combined
 * `/me/circle` figure it gets compared against is not track-scoped either; using
 * a narrower base on one side would make the two operands incomparable.
 */
export function countSolvedByDifficulty(categories: Category[]): DifficultyCounts {
  const counts: DifficultyCounts = { ...ZERO_COUNTS };
  for (const c of categories) {
    for (const p of c.items) {
      if (!p.done) continue;
      const d = difficultyFor(p.diff);
      if (d) counts[d.key] += 1;
    }
  }
  return counts;
}

/** A leaderboard member's own breakdown, already per-difficulty from the API. */
export function memberCounts(member: Member): DifficultyCounts {
  return {
    easy: member.byDiff.easy,
    medium: member.byDiff.medium,
    hard: member.byDiff.hard,
  };
}

/** Turns `[{label,val}]` rows (e.g. `/me/circle`) into keyed counts. */
export function countsFromLabelled(
  rows: { label: string; val: number }[],
): DifficultyCounts {
  const counts: DifficultyCounts = { ...ZERO_COUNTS };
  for (const row of rows) {
    const d = difficultyFor(row.label);
    if (d) counts[d.key] = row.val;
  }
  return counts;
}

/** `a - b`, clamped at zero so a data mismatch never renders a negative bar. */
export function subtractCounts(
  a: DifficultyCounts,
  b: DifficultyCounts,
): DifficultyCounts {
  const out: DifficultyCounts = { ...ZERO_COUNTS };
  for (const d of DIFFICULTY) out[d.key] = Math.max(0, a[d.key] - b[d.key]);
  return out;
}

export function totalCounts(counts: DifficultyCounts): number {
  return DIFFICULTY.reduce((n, d) => n + counts[d.key], 0);
}
