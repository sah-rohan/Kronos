import { DIFFICULTY, difficultyFor, type DifficultyKey } from "./difficulty";
import type { Category, Member } from "../types";

export type DifficultyCounts = Record<DifficultyKey, number>;

export const ZERO_COUNTS: DifficultyCounts = { easy: 0, medium: 0, hard: 0 };

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

export function memberCounts(member: Member): DifficultyCounts {
  return {
    easy: member.byDiff.easy,
    medium: member.byDiff.medium,
    hard: member.byDiff.hard,
  };
}

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
