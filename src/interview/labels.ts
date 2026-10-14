import type { CodeLanguage, InterviewKind, LiveMark, Mark, Verdict } from "../lib/api";

export const LANGUAGES: { key: CodeLanguage; label: string }[] = [
  { key: "python", label: "Python 3" },
  { key: "java", label: "Java" },
  { key: "cpp", label: "C++" },
  { key: "javascript", label: "JavaScript" },
  { key: "go", label: "Go" },
];

export const languageLabel = (k?: CodeLanguage) => LANGUAGES.find((l) => l.key === k)?.label ?? "";

export const KINDS: { key: InterviewKind; name: string; minutes: number; blurb: string }[] = [
  {
    key: "coding",
    name: "Coding",
    minutes: 45,
    blurb: "A LeetCode-style problem in a live editor. Explain your approach, write working code, and get scored on correctness, complexity and testing.",
  },
  {
    key: "resume",
    name: "From your resume",
    minutes: 40,
    blurb: "Questions built from your primary resume. Expect follow-ups on the decisions, tradeoffs and numbers behind each project you list.",
  },
  {
    key: "behavioral",
    name: "Behavioral",
    minutes: 30,
    blurb: "Questions on conflict, failure and ownership. Answer with a specific situation, what you did and the outcome. Vague answers get follow-ups.",
  },
  {
    key: "design",
    name: "System design",
    minutes: 45,
    blurb: "Take a large-scale system from requirements to architecture, then handle follow-ups on bottlenecks, failures and scaling.",
  },
];

export const kindName = (k: InterviewKind) => KINDS.find((x) => x.key === k)?.name ?? k;

export const AREAS = ["Understanding", "Approach", "Code", "Complexity", "Testing", "Communication"];

export const MARK_LABEL: Record<LiveMark, string> = { unseen: "Not yet", weak: "Weak", solid: "Solid", strong: "Strong" };

export const markTone = (m?: LiveMark) => (m === "weak" ? "text-danger" : m === "unseen" ? "text-muted-foreground" : "text-accent");

export const VERDICTS: { key: Verdict; label: string }[] = [
  { key: "no_hire", label: "No hire" },
  { key: "lean_no_hire", label: "Lean no hire" },
  { key: "lean_hire", label: "Lean hire" },
  { key: "hire", label: "Hire" },
  { key: "strong_hire", label: "Strong hire" },
];

export const verdictLabel = (v?: Verdict) => VERDICTS.find((x) => x.key === v)?.label ?? "";

export const verdictTone = (v?: Verdict) => (v === "hire" || v === "strong_hire" || v === "lean_hire" ? "text-accent" : "text-danger");

export const isMark = (m: LiveMark): m is Mark => m !== "unseen";
