/**
 * The single source of truth for difficulty — audit finding #3.
 *
 * Root cause the audit found: the chart marks and the legend swatches were
 * coloured independently, so they drifted until none of the three legend colours
 * actually appeared on the chart. On top of that the same three difficulties had
 * *four* separate colour definitions across the codebase (`diffStyles` in
 * data/problems.ts, `difficultyBars` in data/source.tsx, and two inlined copies
 * inside MyProgressCard), one of which coloured by sort rank rather than by
 * difficulty at all — so the colours changed meaning as the data changed.
 *
 * Everything now reads from this one array. A legend swatch and its
 * corresponding mark are the same `token` string, resolved to the same CSS
 * custom property, so they cannot disagree.
 *
 * The colours themselves live in the `@theme` block of `src/index.css` as
 * `--color-difficulty-*`, chosen for lightness separation (not hue alone) so
 * they survive deuteranopia/protanopia and greyscale. See the comment there for
 * the measured contrast figures.
 */

export type DifficultyKey = "easy" | "medium" | "hard";

export type Difficulty = {
  key: DifficultyKey;
  /** Display label, and the value the API uses. */
  label: "Easy" | "Medium" | "Hard";
  /** Tailwind token stem: `bg-${token}`, `text-${token}-foreground`, etc. */
  token: string;
  /** Semantic sort position. Charts order by this, never by value. */
  order: number;
};

export const DIFFICULTY: readonly Difficulty[] = [
  { key: "easy", label: "Easy", token: "difficulty-easy", order: 0 },
  { key: "medium", label: "Medium", token: "difficulty-medium", order: 1 },
  { key: "hard", label: "Hard", token: "difficulty-hard", order: 2 },
] as const;

/** Lookup by key. */
export const DIFFICULTY_BY_KEY: Record<DifficultyKey, Difficulty> = {
  easy: DIFFICULTY[0],
  medium: DIFFICULTY[1],
  hard: DIFFICULTY[2],
};

/**
 * Lookup by the API's capitalised label, tolerating unexpected casing.
 * Returns `undefined` rather than guessing, so callers decide the fallback.
 */
export function difficultyFor(label: string): Difficulty | undefined {
  const needle = label.trim().toLowerCase();
  return DIFFICULTY.find((d) => d.key === needle);
}

/**
 * Tailwind classes for a filled difficulty chip/bar. Both the mark and its
 * legend swatch call this, which is the mechanism that keeps them identical.
 */
export function difficultyFill(d: Difficulty): string {
  return `bg-${d.token} text-${d.token}-foreground`;
}

/** Just the background, for bars and swatches that carry no text. */
export function difficultyBg(d: Difficulty): string {
  return `bg-${d.token}`;
}

/**
 * Explicit class strings for Tailwind's scanner.
 *
 * Tailwind v4 extracts class names by scanning source text, so the template
 * literals above are invisible to it. This constant is never rendered; it exists
 * so the utilities the helpers build at runtime are guaranteed to be generated.
 * If you add a difficulty token, add its classes here too.
 */
export const DIFFICULTY_SAFELIST = [
  "bg-difficulty-easy text-difficulty-easy-foreground",
  "bg-difficulty-medium text-difficulty-medium-foreground",
  "bg-difficulty-hard text-difficulty-hard-foreground",
  "text-difficulty-easy",
  "text-difficulty-medium",
  "text-difficulty-hard",
].join(" ");
