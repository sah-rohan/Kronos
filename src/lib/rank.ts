import type { Category } from "../types";

export const DIFF_WEIGHTS = { easy: 1, medium: 4, hard: 7 } as const;

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export type RankInfo = {
  rating: number; // 0–100, weighted by difficulty (100 = solved everything)
  tier: Tier;
  text: string; // text color for the tier label
  badge: string; // pill classes (tinted bg + colored text)
  dot: string; // solid bg color for a small tier dot
};

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

export const TIER_MINS: { tier: Tier; min: number }[] = [
  { tier: "Bronze", min: 0 },
  { tier: "Silver", min: 25 },
  { tier: "Gold", min: 50 },
  { tier: "Platinum", min: 75 },
];

function earnedForRating(rating: number, maxWeight: number): number {
  const R = rating / 100;
  const s = (-0.6 + Math.sqrt(0.36 + 1.6 * R)) / 0.8; 
  return s * s * maxWeight;
}

export function nextRank(
  easy: number,
  medium: number,
  hard: number,
  maxWeight: number,
): { tier: Tier; min: number; easy: number; medium: number; hard: number } | null {
  const { rating } = rankFor(easy, medium, hard, maxWeight);
  const next = TIER_MINS.find((t) => t.min > rating);
  if (!next) return null; // already Platinum
  const earned = easy * DIFF_WEIGHTS.easy + medium * DIFF_WEIGHTS.medium + hard * DIFF_WEIGHTS.hard;
  const need = Math.max(0, earnedForRating(next.min, maxWeight) - earned);
  return {
    tier: next.tier,
    min: next.min,
    easy: Math.max(1, Math.ceil(need / DIFF_WEIGHTS.easy)),
    medium: Math.max(1, Math.ceil(need / DIFF_WEIGHTS.medium)),
    hard: Math.max(1, Math.ceil(need / DIFF_WEIGHTS.hard)),
  };
}

export function rankFor(
  easy: number,
  medium: number,
  hard: number,
  maxWeight: number,
): RankInfo {
  const earned = easy * DIFF_WEIGHTS.easy + medium * DIFF_WEIGHTS.medium + hard * DIFF_WEIGHTS.hard;
  const ratio = maxWeight > 0 ? Math.min(1, earned / maxWeight) : 0;
  const rating = Math.round((0.6 * Math.sqrt(ratio) + 0.4 * ratio) * 100);

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
