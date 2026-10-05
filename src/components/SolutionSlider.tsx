import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import hljs from "highlight.js/lib/common";
import type { Solution } from "../types";

const HLJS_LANG: Record<string, string> = {
  python3: "python", python: "python", java: "java", cpp: "cpp", "c++": "cpp",
  c: "c", csharp: "csharp", "c#": "csharp", javascript: "javascript", typescript: "typescript",
  golang: "go", go: "go", kotlin: "kotlin", swift: "swift", ruby: "ruby", rust: "rust",
  scala: "scala", php: "php", dart: "dart",
};

export function SolutionSlider({ solutions }: { solutions: Solution[] }) {
  const [index, setIndex] = useState(0);
  const s = solutions[index];
  const highlighted = useMemo(() => {
    if (!s) return "";
    const lang = HLJS_LANG[(s.lang || "").toLowerCase()];
    try {
      return lang && hljs.getLanguage(lang)
        ? hljs.highlight(s.code, { language: lang }).value
        : hljs.highlightAuto(s.code).value;
    } catch {
      return s.code.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    }
  }, [s]);
  if (!s) {
    return <p className="mt-5 text-sm text-muted-foreground">No solutions yet.</p>;
  }
  return (
    <div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="eyebrow text-foreground">{s.lang}</span>
          <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
            {s.runtimeMs} ms · beats {s.runtimePct}%
          </span>
          {s.optimal && <span className="eyebrow text-accent">Optimal</span>}
        </div>
        {solutions.length > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Previous solution"
              onClick={() => setIndex((index - 1 + solutions.length) % solutions.length)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border-strong transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-12 shrink-0 whitespace-nowrap text-center font-mono text-xs text-muted-foreground">
              {index + 1} / {solutions.length}
            </span>
            <button
              aria-label="Next solution"
              onClick={() => setIndex((index + 1) % solutions.length)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border-strong transition-colors hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <pre className="modal-scroll mt-4 max-h-[60vh] overflow-auto rounded-lg border border-border bg-card p-5 font-mono text-[12.5px] leading-relaxed text-foreground">
        <code className="hljs bg-transparent p-0" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
