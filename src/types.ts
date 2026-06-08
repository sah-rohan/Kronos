export type Diff = "Easy" | "Medium" | "Hard";
export type Problem = { name: string; slug: string; diff: Diff; done: boolean; optimal: boolean };
export type Friend = { id: string; name: string; initials: string; username: string; color: string };
export type Solution = { lang: string; runtimeMs: number; runtimePct: number; optimal: boolean; code: string };
export type Month = { year: number; month: number };
export type Person = { name: string; initials: string; color: string };
export type Member = {
  name: string;
  initials: string;
  color: string;
  solved: number;
  streak?: number;
  username?: string;
};
export type RecentItem = { n: number; slug: string; name: string; diff: string; who: Person[] };
export type DifficultyTotal = { label: string; count: number };
export type Category = { title: string; items: Problem[] };
export type ProblemRef = { name: string; slug: string; diff: string };
