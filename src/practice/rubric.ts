import type { PadLanguage, PadMark } from "../lib/api";

export const LANGUAGES: { key: PadLanguage; label: string }[] = [
  { key: "python", label: "Python 3" },
  { key: "java", label: "Java" },
  { key: "cpp", label: "C++" },
  { key: "javascript", label: "JavaScript" },
  { key: "go", label: "Go" },
];

export const languageLabel = (k: PadLanguage) => LANGUAGES.find((l) => l.key === k)?.label ?? k;

export const AREAS: { name: string; hint: string }[] = [
  { name: "Understanding", hint: "Restate it; name sizes and edge cases." },
  { name: "Approach", hint: "Brute force first, then why the better one." },
  { name: "Code", hint: "Correct, readable, idiomatic." },
  { name: "Complexity", hint: "Time and space, stated and right." },
  { name: "Testing", hint: "Trace a normal case and an edge case." },
  { name: "Communication", hint: "Explain why, before or beside the code." },
];

export const MARK_LABEL: Record<PadMark, string> = { weak: "Weak", solid: "Solid", strong: "Strong" };
export const markTone = (m?: PadMark) => (m === "weak" ? "text-danger" : "text-accent");

export const minutesBetween = (from: string, to?: string) =>
  Math.max(1, Math.round(((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 60000));
