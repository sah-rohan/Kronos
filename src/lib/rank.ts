import type { Category } from "../types";

// Difficulty weights — harder problems contribute more to the rating.
export const DIFF_WEIGHTS = { easy: 1, medium: 3, hard: 6 } as const;

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export type RankInfo = {
  rating: number; // 0–100, weighted by difficulty (100 = solved everything)
  tier: Tier;
  text: string; // text color for the tier label
  badge: string; // pill classes (tinted bg + colored text)
  dot: string; // solid bg color for a small tier dot
};

// Max weighted points available across the whole catalog (so a perfect run = 100).
export function maxWeighted(categories: Category[]): number {
  let e = 0,
    m = 0,
    h = 0;
  for (const c of categories)
    for (const p of c.items) {
      if (p.diff === "Easy") e++;
      else if (p.diff === "Medium") m++;
      else h++;
    }
  return e * DIFF_WEIGHTS.easy + m * DIFF_WEIGHTS.medium + h * DIFF_WEIGHTS.hard;
}

export function rankFor(
  easy: number,
  medium: number,
  hard: number,
  maxWeight: number,
): RankInfo {
  const earned = easy * DIFF_WEIGHTS.easy + medium * DIFF_WEIGHTS.medium + hard * DIFF_WEIGHTS.hard;
  const rating = maxWeight > 0 ? Math.round(Math.min(100, (earned / maxWeight) * 100)) : 0;

  let tier: Tier;
  if (rating >= 75) tier = "Platinum";
  else if (rating >= 50) tier = "Gold";
  else if (rating >= 25) tier = "Silver";
  else tier = "Bronze";

  const styles: Record<Tier, { text: string; badge: string; dot: string }> = {
    Bronze: { text: "text-[#e08a4b]", badge: "bg-[#e08a4b]/15 text-[#e08a4b]", dot: "bg-[#e08a4b]" },
    Silver: { text: "text-[#aab6c6]", badge: "bg-[#aab6c6]/15 text-[#aab6c6]", dot: "bg-[#aab6c6]" },
    Gold: { text: "text-[#f4b400]", badge: "bg-[#f4b400]/15 text-[#f4b400]", dot: "bg-[#f4b400]" },
    Platinum: { text: "text-[#22d3ee]", badge: "bg-[#22d3ee]/15 text-[#22d3ee]", dot: "bg-[#22d3ee]" },
  };
  return { rating, tier, ...styles[tier] };
}
