export type DifficultyKey = "easy" | "medium" | "hard";

export type Difficulty = {
  key: DifficultyKey;
  label: "Easy" | "Medium" | "Hard";
  token: string;
  order: number;
};

export const DIFFICULTY: readonly Difficulty[] = [
  { key: "easy", label: "Easy", token: "difficulty-easy", order: 0 },
  { key: "medium", label: "Medium", token: "difficulty-medium", order: 1 },
  { key: "hard", label: "Hard", token: "difficulty-hard", order: 2 },
] as const;

export const DIFFICULTY_BY_KEY: Record<DifficultyKey, Difficulty> = {
  easy: DIFFICULTY[0],
  medium: DIFFICULTY[1],
  hard: DIFFICULTY[2],
};

export function difficultyFor(label: string): Difficulty | undefined {
  const needle = label.trim().toLowerCase();
  return DIFFICULTY.find((d) => d.key === needle);
}

export function difficultyFill(d: Difficulty): string {
  return `bg-${d.token} text-${d.token}-foreground`;
}

/** Just the background, for bars and swatches that carry no text. */
export function difficultyBg(d: Difficulty): string {
  return `bg-${d.token}`;
}

export const DIFFICULTY_SAFELIST = [
  "bg-difficulty-easy text-difficulty-easy-foreground",
  "bg-difficulty-medium text-difficulty-medium-foreground",
  "bg-difficulty-hard text-difficulty-hard-foreground",
  "text-difficulty-easy",
  "text-difficulty-medium",
  "text-difficulty-hard",
].join(" ");
