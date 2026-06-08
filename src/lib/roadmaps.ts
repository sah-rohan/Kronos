import type { Category, Problem, ProblemList } from "../types";

export const ROADMAPS: { key: ProblemList; label: string }[] = [
  { key: "blind75", label: "Blind 75" },
  { key: "neetcode150", label: "NeetCode 150" },
  { key: "neetcode250", label: "NeetCode 250" },
];

export const ROADMAP_LABEL: Record<ProblemList, string> = {
  blind75: "Blind 75",
  neetcode150: "NeetCode 150",
  neetcode250: "NeetCode 250",
  all: "All",
};

export function inList(p: Pick<Problem, "blind75" | "neetcode150" | "neetcode250">, list: ProblemList): boolean {
  if (list === "all") return true;
  if (list === "blind75") return p.blind75;
  if (list === "neetcode250") return p.neetcode250;
  return p.neetcode150;
}

export function listTotal(categories: Category[], list: ProblemList): number {
  return categories.reduce((n, c) => n + c.items.filter((p) => inList(p, list)).length, 0);
}
