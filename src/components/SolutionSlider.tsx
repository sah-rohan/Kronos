import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { langStyles } from "../data/friends";
import type { Solution } from "../types";

type Hljs = typeof import("highlight.js/lib/common").default;
let hljsPromise: Promise<Hljs> | null = null;

function loadHljs(): Promise<Hljs> {
  hljsPromise ??= import("highlight.js/lib/common").then((m) => m.default);
  return hljsPromise;
}

function escapeHtml(code: string): string {
  return code.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!,
  );
}

const HLJS_LANG: Record<string, string> = {
  python3: "python", python: "python", java: "java", cpp: "cpp", "c++": "cpp",
  c: "c", csharp: "csharp", "c#": "csharp", javascript: "javascript", typescript: "typescript",
  golang: "go", go: "go", kotlin: "kotlin", swift: "swift", ruby: "ruby", rust: "rust",
  scala: "scala", php: "php", dart: "dart",
};

export function SolutionSlider({ solutions }: { solutions: Solution[] }) {
  const [index, setIndex] = useState(0);
  const s = solutions[index];
  const [rendered, setRendered] = useState<{ code: string; html: string } | null>(null);

  useEffect(() => {
    if (!s) return;
    let cancelled = false;
    loadHljs()
      .then((hljs) => {
        if (cancelled) return;
        const lang = HLJS_LANG[(s.lang || "").toLowerCase()];
        try {
          const html =
            lang && hljs.getLanguage(lang)
              ? hljs.highlight(s.code, { language: lang }).value
              : hljs.highlightAuto(s.code).value;
          setRendered({ code: s.code, html });
        } catch {
          setRendered({ code: s.code, html: escapeHtml(s.code) });
        }
      })
      .catch(() => {
        if (!cancelled) setRendered({ code: s.code, html: escapeHtml(s.code) });
      });
    return () => {
      cancelled = true;
    };
  }, [s]);

  // Show unhighlighted code immediately rather than an empty block.
  const highlighted =
    rendered && s && rendered.code === s.code
      ? rendered.html
      : s
        ? escapeHtml(s.code)
        : "";
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
