import type { Diff } from "../types";

export const DIFFS: Diff[] = ["Easy", "Medium", "Hard"];

// Solid fill used for difficulty bars and swatches.
export const DIFF_BAR: Record<string, string> = { Easy: "bg-easy", Medium: "bg-medium", Hard: "bg-hard" };

export type DiffCounts = { easy: number; medium: number; hard: number };

export function countByDiff(items: { diff: string }[]): DiffCounts {
  const t = { easy: 0, medium: 0, hard: 0 };
  for (const p of items) {
    if (p.diff === "Easy") t.easy++;
    else if (p.diff === "Medium") t.medium++;
    else t.hard++;
  }
  return t;
}
