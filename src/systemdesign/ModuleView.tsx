/**
 * A single System Design / GenAI module, as a page.
 *
 * Migrated from `SystemDesignModal.tsx`. The modal shell is gone; `stage` and
 * `slide` now live in the URL as `?stage=` and `?slide=`, so a specific step of
 * a specific module is linkable and survives a refresh.
 *
 * Push vs replace: stepping through slides uses `replace`, matching the house
 * rule that moving *within* a screen is not history-worthy while moving
 * *between* screens is. A 20-slide module would otherwise bury the back button
 * under 20 entries before you could get back to the index.
 *
 * `answers` and `walkStep` stay local: they are working state, not a location.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { SDComponentType, SDProblem, SDSlide } from "./problems";
import { SystemDesignCanvas } from "./SystemDesignCanvas";
import { SystemDiagram } from "./SystemDiagram";
import { ConceptDiagram } from "./ConceptDiagrams";
import { markCompleted } from "./progress";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";

const STAGES = ["learn", "build", "done"] as const;
type Stage = (typeof STAGES)[number];

export function ModuleView({
  problem,
  kicker,
  backTo,
  backLabel,
}: {
  problem: SDProblem;
  /** "System Design" or "GenAI System Design" — shown above the title. */
  kicker: string;
  backTo: string;
  backLabel: string;
}) {
  const { getToken } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [answers, setAnswers] = useState<Record<number, string>>({});

  /**
   * Walkthrough position, stored together with the slide it belongs to.
   *
   * Storing the pair means "arriving at a different slide resets the step" falls
   * out of a plain read instead of needing `useEffect(() => setWalkStep(0),
   * [slide])` — which is the pattern react-hooks/set-state-in-effect flags, and
   * which caused a cascading render on every slide change.
   */
  const [walk, setWalk] = useState<{ slide: number; step: number }>({
    slide: 0,
    step: 0,
  });

  // Intro slides, then a flow walkthrough, then one slide per component so every
  // part is explained before the user has to place it.
  const slides = useMemo<SDSlide[]>(
    () => [
      ...problem.slides,
      {
        title: "Full flow walkthrough",
        body: "Step through the whole request and response, one hop at a time. Solid coral arrows are requests; dashed blue arrows are the data coming back.",
        walk: true,
      },
      ...problem.palette.map((c) => ({ title: c.name, body: c.explain })),
    ],
    [problem],
  );

  const rawStage = searchParams.get("stage");
  const stage: Stage = STAGES.includes(rawStage as Stage) ? (rawStage as Stage) : "learn";

  const rawSlide = Number(searchParams.get("slide"));
  // Clamp rather than throw: a hand-edited or stale `?slide=` must not break the
  // page, and slide counts differ per module.
  const slide =
    Number.isInteger(rawSlide) && rawSlide >= 0
      ? Math.min(rawSlide, slides.length - 1)
      : 0;

  const setStep = (next: { stage?: Stage; slide?: number }) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next.stage !== undefined) {
          if (next.stage === "learn") params.delete("stage");
          else params.set("stage", next.stage);
        }
        if (next.slide !== undefined) {
          if (next.slide === 0) params.delete("slide");
          else params.set("slide", String(next.slide));
        }
        return params;
      },
      { replace: true },
    );
  };

  const goSlide = (n: number) =>
    setStep({ slide: Math.max(0, Math.min(slides.length - 1, n)) });

  const totalSteps = problem.connections.length + (problem.returns?.length ?? 0);
  const walkStep = walk.slide === slide ? walk.step : 0;
  const setWalkStep = (step: number) =>
    setWalk({ slide, step: Math.max(0, Math.min(totalSteps - 1, step)) });

  const onSolved = () => {
    markCompleted(problem.slug);
    api.sdSolve(getToken, problem.slug).catch(() => {});
    setStep({ stage: "done" });
  };

  const last = slide === slides.length - 1;
  const quiz = slides[slide].quiz;
  const answered = quiz ? answers[slide] !== undefined : true;
  const nextLocked = !answered; // must answer a quiz before moving on

  // Reveal components on the diagram. A slide with `focus` shows just those
  // components (a sub-diagram, e.g. the write path); otherwise the diagram builds
  // up progressively as the user reaches each component slide.
  const introCount = problem.slides.length + 1; // +1 for the walkthrough slide
  const isWalk = !!slides[slide]?.walk;
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
  const currentType =
    !focus && slide >= introCount ? problem.palette[slide - introCount].type : undefined;
  const nameOf = (t: SDComponentType) =>
    problem.palette.find((c) => c.type === t)?.name ?? t;
  // Only explain connections to components already introduced, so reasons appear
  // in step with the diagram (e.g. analytics isn't mentioned before it's taught).
  const outgoing = currentType
    ? problem.connections.filter(([f, t]) => f === currentType && revealed.has(t))
    : [];
  const incoming = currentType
    ? problem.connections.filter(([f, t]) => t === currentType && revealed.has(f))
    : [];

  return (
    <>
      <PageHeader
        title={problem.title}
        backTo={stage === "build" ? undefined : backTo}
        backLabel={backLabel}
        subtitle={
          <span className="text-xs font-medium uppercase tracking-wide text-coral">
            {kicker} · {problem.difficulty}
          </span>
        }
        actions={
          stage === "build" ? (
            <button
              onClick={() => setStep({ stage: "learn" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" /> Back to learning
            </button>
          ) : undefined
        }
      />

      <div className="rounded-[24px] border border-border bg-card p-6 sm:p-8">
        {/* LEARN */}
        {stage === "learn" && (
          <div className="flex flex-col">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="sm:w-1/2">
                <div className="font-display text-xl">{slides[slide].title}</div>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {slides[slide].body}
                </p>

                {isWalk && (
                  <Walkthrough
                    problem={problem}
                    totalSteps={totalSteps}
                    nameOf={nameOf}
                    step={walkStep}
                    onStep={setWalkStep}
                  />
                )}

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
                        {quiz.why}
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
                        <span className="text-muted-foreground">
                          {problem.connectionWhy[`${f}>${t}`]}
                        </span>
                      </div>
                    ))}
                    {incoming.map(([f, t]) => (
                      <div key={`i${f}`} className="text-[13px] leading-snug">
                        <span className="font-medium text-coral">← {nameOf(f)}</span>{" "}
                        <span className="text-muted-foreground">
                          {problem.connectionWhy[`${f}>${t}`]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sticky so the diagram stays in view while the text column scrolls. */}
              <div className="shrink-0 rounded-2xl border border-border bg-background/40 p-4 sm:sticky sm:top-4 sm:w-1/2 [&_svg]:mx-auto [&_svg]:max-h-[42dvh] sm:[&_svg]:max-h-[62dvh]">
                {slides[slide].art ? (
                  <ConceptDiagram id={slides[slide].art!} />
                ) : (
                  <SystemDiagram
                    problem={problem}
                    revealed={revealed}
                    current={currentType}
                    step={isWalk ? walkStep : undefined}
                  />
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === slide ? "w-5 bg-coral" : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goSlide(slide - 1)}
                  disabled={slide === 0}
                  aria-label="Previous slide"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {last ? (
                  <button
                    onClick={() => setStep({ stage: "build" })}
                    disabled={nextLocked}
                    className="rounded-full bg-coral px-5 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-40"
                  >
                    Start building
                  </button>
                ) : (
                  <button
                    onClick={() => goSlide(slide + 1)}
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
          <div className="flex flex-col">
            <p className="mb-3 text-sm text-muted-foreground">
              Drag every component onto the canvas and connect them into a working design, then check it.
            </p>
            <div className="min-h-[60dvh]">
              <SystemDesignCanvas problem={problem} onSolved={onSolved} />
            </div>
          </div>
        )}

        {/* DONE */}
        {stage === "done" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#3fae6a]/15 text-[#3fae6a]">
              <Check className="h-7 w-7" />
            </div>
            <div className="font-display mt-4 text-2xl tracking-tight">Design complete</div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              You connected every component in {problem.title} correctly.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setStep({ stage: "build" })}
                className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                Build again
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * The flow walkthrough. Controlled, because the diagram beside it highlights the
 * same step and the two must not drift apart.
 */
function Walkthrough({
  problem,
  totalSteps,
  nameOf,
  step: walkStep,
  onStep,
}: {
  problem: SDProblem;
  totalSteps: number;
  nameOf: (t: SDComponentType) => string;
  step: number;
  onStep: (next: number) => void;
}) {
  const allEdges = [...problem.connections, ...(problem.returns ?? [])];
  const [ef, et] = allEdges[walkStep] ?? [];
  const isReturn = walkStep >= problem.connections.length;
  const why = ef
    ? problem.connectionWhy[`${ef}>${et}`] ??
      `${nameOf(ef)} returns its response to ${nameOf(et)}.`
    : "";

  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Step {walkStep + 1} / {totalSteps}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStep(walkStep - 1)}
            disabled={walkStep === 0}
            aria-label="Previous step"
            className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onStep(walkStep + 1)}
            disabled={walkStep >= totalSteps - 1}
            aria-label="Next step"
            className="grid h-8 w-8 place-items-center rounded-full bg-coral text-coral-foreground transition hover:opacity-95 disabled:opacity-30"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {ef && (
        <div className="mt-3 text-sm">
          <span className={`font-medium ${isReturn ? "text-sky" : "text-coral"}`}>
            {nameOf(ef)} {isReturn ? "⇠" : "→"} {nameOf(et)}
          </span>
          <span className="ml-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {isReturn ? "response" : "request"}
          </span>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{why}</p>
        </div>
      )}
    </div>
  );
}
