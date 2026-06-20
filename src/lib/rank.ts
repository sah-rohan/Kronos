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

export type NextOption =
  | { diff: "easy" | "medium" | "hard"; count: number }
  | {
      combo: [
        { diff: "easy" | "medium" | "hard"; count: number },
        { diff: "easy" | "medium" | "hard"; count: number },
      ];
    };

// How far to the next tier, as "~N more of a difficulty". Only difficulties with
// enough problems left in the catalog to actually get you there are returned, so
// we never suggest solving more than exist.
export function nextRank(
  easy: number,
  medium: number,
  hard: number,
  maxWeight: number,
  totals: { easy: number; medium: number; hard: number },
): { tier: Tier; min: number; opts: NextOption[] } | null {
  const { rating } = rankFor(easy, medium, hard, maxWeight);
  const next = TIER_MINS.find((t) => t.min > rating);
  if (!next) return null; // already Platinum

  const earned = easy * DIFF_WEIGHTS.easy + medium * DIFF_WEIGHTS.medium + hard * DIFF_WEIGHTS.hard;
  const need = Math.max(0, earnedForRating(next.min, maxWeight) - earned);
  const remaining = {
    easy: Math.max(0, totals.easy - easy),
    medium: Math.max(0, totals.medium - medium),
    hard: Math.max(0, totals.hard - hard),
  };

const singles = (["easy", "medium", "hard"] as const).flatMap<NextOption>((d) => {
    const count = Math.max(1, Math.ceil(need / DIFF_WEIGHTS[d]));
    return count <= remaining[d] ? [{ diff: d, count }] : [];
  });

  // Combos: pairs of difficulties, only surfaced when neither one alone (given
  // what's left in the catalog) can close the gap, but the two together can.
  // We max out the heavier/scarcer difficulty first since it's more weight-efficient,
  // then top up with the lighter one for whatever's left over.
  type DiffInfo = { diff: "easy" | "medium" | "hard"; weight: number; remaining: number };
  const info = (d: "easy" | "medium" | "hard"): DiffInfo => ({
    diff: d,
    weight: DIFF_WEIGHTS[d],
    remaining: remaining[d],
  });

  function comboFor(lo: DiffInfo, hi: DiffInfo): NextOption | null {
    if (need <= 0 || lo.remaining <= 0 || hi.remaining <= 0) return null;
    const hiCount = Math.min(hi.remaining, Math.ceil(need / hi.weight));
    const leftover = need - hiCount * hi.weight;
    if (leftover <= 0) return null; // hi alone would've been enough -> that's a single, skip
    const loCount = Math.ceil(leftover / lo.weight);
    if (loCount <= 0 || loCount > lo.remaining) return null;
    return {
      combo: [
        { diff: lo.diff, count: loCount },
        { diff: hi.diff, count: hiCount },
      ],
    };
  }

  const pairs: [DiffInfo, DiffInfo][] = [
    [info("easy"), info("medium")],
    [info("medium"), info("hard")],
    [info("easy"), info("hard")],
  ];
  const combos = pairs.flatMap<NextOption>((pair) => {
    const c = comboFor(pair[0], pair[1]);
    return c ? [c] : [];
  });

  return { tier: next.tier, min: next.min, opts: [...singles, ...combos] };
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
