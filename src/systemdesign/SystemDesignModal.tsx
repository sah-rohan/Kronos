import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import type { SDComponentType, SDProblem } from "./problems";
import { SystemDesignCanvas } from "./SystemDesignCanvas";
import { SystemDiagram } from "./SystemDiagram";
import { markCompleted } from "./progress";

type Stage = "learn" | "build" | "done";

export function SystemDesignModal({
  problem,
  onClose,
}: {
  problem: SDProblem;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("learn");
  const [slide, setSlide] = useState(0);
  // Remembered quiz answers, keyed by slide index.
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Intro slides, then one slide per component so every part is explained before
  // the user has to place it.
  const slides = useMemo(
    () => [
      ...problem.slides,
      ...problem.palette.map((c) => ({ title: c.name, body: c.explain })),
    ],
    [problem],
  );

  const onSolved = () => {
    markCompleted(problem.slug);
    setStage("done");
  };

  const last = slide === slides.length - 1;
  const quiz = slides[slide].quiz;
  const answered = quiz ? answers[slide] !== undefined : true;
  const nextLocked = !answered; // must answer a quiz before moving on

  // Reveal components on the diagram. A slide with `focus` shows just those
  // components (a sub-diagram, e.g. the write path); otherwise the diagram builds
  // up progressively as the user reaches each component slide.
  const introCount = problem.slides.length;
  const focus = slides[slide]?.focus;
  const revealed = useMemo(() => {
    if (focus) return new Set<SDComponentType>(focus);
    const set = new Set<SDComponentType>();
    if (slide >= introCount) {
      for (let i = 0; i <= slide - introCount; i++) set.add(problem.palette[i].type);
    }
    return set;
  }, [slide, introCount, problem, focus]);

  // The component being taught on this slide (undefined on primer/focus slides).
  const currentType = !focus && slide >= introCount ? problem.palette[slide - introCount].type : undefined;
  const nameOf = (t: SDComponentType) => problem.palette.find((c) => c.type === t)?.name ?? t;
  // Only explain connections to components already introduced, so reasons appear
  // in step with the diagram (e.g. analytics isn't mentioned before it's taught).
  const outgoing = currentType
    ? problem.connections.filter(([f, t]) => f === currentType && revealed.has(t))
    : [];
  const incoming = currentType
    ? problem.connections.filter(([f, t]) => t === currentType && revealed.has(f))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-sky-foreground/25 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-surface relative flex h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-border p-6 shadow-[0_30px_80px_-20px_rgba(7,55,129,0.55)] sm:p-8">
        {stage === "build" && (
          <button
            onClick={() => setStage("learn")}
            className="absolute left-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={`${stage === "build" ? "px-12" : "pr-12"}`}>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-coral">System Design</div>
          <div className="font-display text-2xl tracking-tight">{problem.title}</div>
        </div>

        {/* LEARN */}
        {stage === "learn" && (
          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto sm:flex-row sm:items-center">
              <div className="sm:w-1/2">
                <div className="font-display text-xl">{slides[slide].title}</div>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {slides[slide].body}
                </p>
                {slides[slide].bullets && (
                  <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-muted-foreground">
                    {slides[slide].bullets!.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {quiz && (
                  <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
                    <div className="text-sm font-medium">{quiz.prompt}</div>
                    <div className="mt-3 flex flex-col gap-2">
                      {quiz.options.map((o) => {
                        const picked = answers[slide];
                        const isCorrect = o.id === quiz.correct;
                        const isPicked = picked === o.id;
                        let cls = "border-border text-muted-foreground hover:bg-muted";
                        if (picked !== undefined) {
                          if (isCorrect) cls = "border-[#3fae6a] bg-[#3fae6a]/10 text-foreground";
                          else if (isPicked) cls = "border-coral bg-coral/10 text-foreground";
                          else cls = "border-border text-muted-foreground opacity-60";
                        }
                        return (
                          <button
                            key={o.id}
                            disabled={picked !== undefined}
                            onClick={() => setAnswers((a) => ({ ...a, [slide]: o.id }))}
                            className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${cls}`}
                          >
                            {o.label}
                            {picked !== undefined && isCorrect && " ✓"}
                          </button>
                        );
                      })}
                    </div>
                    {answers[slide] !== undefined && (
                      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                        {answers[slide] === quiz.correct ? "Correct. " : "Not quite. "}
                        {quiz.explain}
                      </p>
                    )}
                  </div>
                )}
                {currentType && (outgoing.length > 0 || incoming.length > 0) && (
                  <div className="mt-4 space-y-2 rounded-2xl border border-border bg-background/40 p-3">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      How it connects
                    </div>
                    {outgoing.map(([f, t]) => (
                      <div key={`o${t}`} className="text-[13px] leading-snug">
                        <span className="font-medium text-coral">→ {nameOf(t)}</span>{" "}
                        <span className="text-muted-foreground">{problem.connectionWhy[`${f}>${t}`]}</span>
                      </div>
                    ))}
                    {incoming.map(([f, t]) => (
                      <div key={`i${f}`} className="text-[13px] leading-snug">
                        <span className="font-medium text-coral">← {nameOf(f)}</span>{" "}
                        <span className="text-muted-foreground">{problem.connectionWhy[`${f}>${t}`]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-background/40 p-4 sm:w-1/2">
                <SystemDiagram problem={problem} revealed={revealed} current={currentType} />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-coral" : "w-1.5 bg-border"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSlide((s) => Math.max(0, s - 1))}
                  disabled={slide === 0}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {last ? (
                  <button
                    onClick={() => setStage("build")}
                    disabled={nextLocked}
                    className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-40"
                  >
                    Start building
                  </button>
                ) : (
                  <button
                    onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))}
                    disabled={nextLocked}
                    title={nextLocked ? "Answer the question to continue" : undefined}
                    className="inline-flex items-center gap-1.5 rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-40"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BUILD */}
        {stage === "build" && (
          <div className="mt-5 flex min-h-0 flex-1 flex-col">
            <p className="mb-3 text-sm text-muted-foreground">
              Drag every component onto the canvas and connect them into a working design, then check it.
            </p>
            <div className="min-h-0 flex-1">
              <SystemDesignCanvas problem={problem} onSolved={onSolved} />
            </div>
          </div>
        )}

        {/* DONE */}
        {stage === "done" && (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#3fae6a]/15 text-[#3fae6a]">
              <Check className="h-7 w-7" />
            </div>
            <div className="font-display mt-4 text-2xl tracking-tight">Design complete</div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              You built a correct URL shortener: traffic enters through the API gateway, the write path
              uses the ID generator (Machine ID + sequence, Base62) and a wide-column database, and the
              read path serves 302 redirects from a read-through cache while analytics counts clicks
              off the critical path.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setStage("build");
                }}
                className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                Build again
              </button>
              <button
                onClick={onClose}
                className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
