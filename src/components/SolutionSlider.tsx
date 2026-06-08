import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import hljs from "highlight.js/lib/common";
import { langStyles } from "../data/friends";
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
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${langStyles[s.lang]}`}>
            {s.lang}
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
            {s.runtimeMs} ms · beats {s.runtimePct}%
          </span>
          {s.optimal && (
            <span className="shrink-0 rounded-full bg-[#d5f0db] px-2.5 py-1 text-[11px] font-medium text-[#2f7d46]">
              Optimal
            </span>
          )}
        </div>
        {solutions.length > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setIndex((index - 1 + solutions.length) % solutions.length)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-12 shrink-0 whitespace-nowrap text-center text-xs text-muted-foreground tabular-nums">
              {index + 1} / {solutions.length}
            </span>
            <button
              onClick={() => setIndex((index + 1) % solutions.length)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <pre className="modal-scroll mt-4 max-h-[55vh] overflow-auto rounded-xl bg-foreground/[0.04] p-4 text-[12px] leading-relaxed text-foreground dark:bg-white/[0.04]">
        <code className="hljs bg-transparent p-0" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
