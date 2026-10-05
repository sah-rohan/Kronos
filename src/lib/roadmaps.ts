import type { Board, Category, Problem, ProblemList } from "../types";

export const ROADMAPS: { key: ProblemList; label: string }[] = [
  { key: "blind75", label: "Blind 75" },
  { key: "neetcode150", label: "NeetCode 150" },
  { key: "neetcode250", label: "NeetCode 250" },
];

export const ROADMAP_LABEL: Record<ProblemList, string> = {
  ...(Object.fromEntries(ROADMAPS.map((r) => [r.key, r.label])) as Record<ProblemList, string>),
  all: "All",
};

// Every board you can pick: a roadmap, or one of the design-module rankings.
export const BOARDS: { key: Board; label: string }[] = [
  ...ROADMAPS,
  { key: "sd", label: "System Design" },
  { key: "genai", label: "AI System Design" },
];

export const isModuleBoard = (b: Board): b is "sd" | "genai" => b === "sd" || b === "genai";

export function inList(p: Pick<Problem, "blind75" | "neetcode150" | "neetcode250">, list: ProblemList): boolean {
  return list === "all" || p[list];
}

export function listTotal(categories: Category[], list: ProblemList): number {
  return categories.reduce((n, c) => n + c.items.filter((p) => inList(p, list)).length, 0);
}
