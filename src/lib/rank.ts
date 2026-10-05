import { countByDiff, type DiffCounts } from "./difficulty";
import type { Category, ProblemList } from "../types";

type DiffKey = keyof DiffCounts;

const DIFF_WEIGHTS: Record<DiffKey, number> = { easy: 1, medium: 4, hard: 7 };
const DIFF_KEYS: DiffKey[] = ["easy", "medium", "hard"];

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export type RankInfo = {
  rating: number; // 0–100, weighted by difficulty (100 = solved everything)
  tier: Tier;
  text: string; // text color for the tier label
  dot: string; // solid bg color for a small tier dot
};

// Ascending, so the last tier whose min you've reached is yours.
export const TIER_MINS: { tier: Tier; min: number }[] = [
  { tier: "Bronze", min: 0 },
  { tier: "Silver", min: 25 },
  { tier: "Gold", min: 50 },
  { tier: "Platinum", min: 75 },
];

const TIER_STYLES: Record<Tier, { text: string; dot: string }> = {
  Bronze: { text: "text-[#9a5420] dark:text-[#e0a274]", dot: "bg-[#e08a4b]" },
  Silver: { text: "text-[#5f6b78] dark:text-[#b9c3cf]", dot: "bg-[#aab6c6]" },
  Gold: { text: "text-[#8a6500] dark:text-[#e8c25a]", dot: "bg-[#f4b400]" },
  Platinum: { text: "text-[#1d6f80] dark:text-[#7fd6e6]", dot: "bg-[#22d3ee]" },
};

const weight = (c: DiffCounts) => DIFF_KEYS.reduce((n, d) => n + c[d] * DIFF_WEIGHTS[d], 0);

// The weighted score of solving every problem in the catalog.
export const maxWeighted = (categories: Category[]) => weight(countByDiff(categories.flatMap((c) => c.items)));

// Rating curve: 0.6·√r + 0.4·r, so early solves move the needle more.
const ratingFor = (ratio: number) => Math.round((0.6 * Math.sqrt(ratio) + 0.4 * ratio) * 100);

// Inverse of the rating curve: the weighted score a rating needs.
function earnedForRating(rating: number, maxWeight: number): number {
  const s = (-0.6 + Math.sqrt(0.36 + 1.6 * (rating / 100))) / 0.8;
  return s * s * maxWeight;
}

export function rankFor(solved: DiffCounts, maxWeight: number): RankInfo {
  const ratio = maxWeight > 0 ? Math.min(1, weight(solved) / maxWeight) : 0;
  const rating = ratingFor(ratio);
  const { tier } = TIER_MINS.findLast((t) => rating >= t.min)!;
  return { rating, tier, ...TIER_STYLES[tier] };
}

type Step = { diff: DiffKey; count: number };
export type NextOption = Step | { combo: [Step, Step] };

// How far to the next tier, as "~N more of a difficulty". Only difficulties with
// enough problems left in the catalog to actually get you there are returned, so
// we never suggest solving more than exist.
export function nextRank(
  solved: DiffCounts,
  maxWeight: number,
  totals: DiffCounts,
): { tier: Tier; min: number; opts: NextOption[] } | null {
  const { rating } = rankFor(solved, maxWeight);
  const next = TIER_MINS.find((t) => t.min > rating);
  if (!next) return null; // already Platinum

  const need = Math.max(0, earnedForRating(next.min, maxWeight) - weight(solved));
  const left = (d: DiffKey) => Math.max(0, totals[d] - solved[d]);

  const singles = DIFF_KEYS.flatMap<NextOption>((d) => {
    const count = Math.max(1, Math.ceil(need / DIFF_WEIGHTS[d]));
    return count <= left(d) ? [{ diff: d, count }] : [];
  });

  // Combos: pairs of difficulties, only surfaced when the heavier one alone
  // (given what's left in the catalog) can't close the gap but the two together
  // can. Max out the heavier difficulty first since it's more weight-efficient,
  // then top up with the lighter one.
  const combo = (lo: DiffKey, hi: DiffKey): NextOption[] => {
    if (need <= 0 || left(lo) <= 0 || left(hi) <= 0) return [];
    const hiCount = Math.min(left(hi), Math.ceil(need / DIFF_WEIGHTS[hi]));
    const leftover = need - hiCount * DIFF_WEIGHTS[hi];
    if (leftover <= 0) return []; // hi alone is enough - that's a single
    const loCount = Math.ceil(leftover / DIFF_WEIGHTS[lo]);
    if (loCount > left(lo)) return [];
    return [{ combo: [{ diff: lo, count: loCount }, { diff: hi, count: hiCount }] }];
  };

  return {
    tier: next.tier,
    min: next.min,
    opts: [...singles, ...combo("easy", "medium"), ...combo("medium", "hard"), ...combo("easy", "hard")],
  };
}

// Sort by solved count on a list; ties share a rank (1, 2, 2, 4).
export function rankMembers<T extends { solvedByList: Record<ProblemList, number> }>(members: T[], list: ProblemList) {
  const sorted = [...members].sort((a, b) => (b.solvedByList[list] ?? 0) - (a.solvedByList[list] ?? 0));
  const out: { m: T; rank: number; solved: number }[] = [];
  sorted.forEach((m, i) => {
    const solved = m.solvedByList[list] ?? 0;
    const rank = i > 0 && solved === out[i - 1].solved ? out[i - 1].rank : i + 1;
    out.push({ m, rank, solved });
  });
  return out;
}
