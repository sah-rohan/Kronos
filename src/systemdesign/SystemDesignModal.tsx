import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Monitor } from "lucide-react";
import type { SDComponentType, SDProblem, SDSlide } from "./problems";
import { SystemDesignCanvas } from "./SystemDesignCanvas";
import { SystemDiagram } from "./SystemDiagram";
import { ConceptDiagram } from "./ConceptDiagrams";
import { TRACK_LABEL, trackOf } from "./catalog";
import { markCompleted, readLastPosition, saveLastPosition } from "./progress";
import { ReaderNav, ReaderNavItem, ReaderPage } from "../components/Reader";
import { StepButton } from "../components/Controls";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { useCanvasSupported } from "../lib/useCanvasSupported";

type Stage = "learn" | "build" | "done";

export function SystemDesignModal({
  problem,
  onClose,
}: {
  problem: SDProblem;
  onClose: () => void;
}) {
  const { getToken } = useData();
  const canvasOk = useCanvasSupported();
  const track = TRACK_LABEL[trackOf(problem.slug)];
  const [stage, setStage] = useState<Stage>("learn");
  const [slide, setSlide] = useState(() => {
    const last = readLastPosition();
    return last?.slug === problem.slug ? last.slide : 0;
  });
  const [furthest, setFurthest] = useState(slide);
  // Remembered quiz answers, keyed by slide index.
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const [walkStep, setWalkStep] = useState(0);
  const totalSteps = problem.connections.length + (problem.returns?.length ?? 0);

  // Intro slides, then a flow walkthrough, then one slide per component so every
  // part is explained before the user has to place it.
  const slides = useMemo<SDSlide[]>(
    () => [
      ...problem.slides,
      {
        title: "Full flow walkthrough",
        body: "Step through the whole request and response, one hop at a time. Solid arrows are requests; dashed arrows are the data coming back.",
        walk: true,
      },
      ...problem.palette.map((c) => ({ title: c.name, body: c.explain })),
    ],
    [problem],
  );

  useEffect(() => {
    saveLastPosition({ slug: problem.slug, slide, total: slides.length, title: slides[slide].title });
  }, [problem.slug, slide, slides]);

  const goTo = (i: number) => {
    setSlide(i);
    setFurthest((f) => Math.max(f, i));
    setWalkStep(0); // restart the walkthrough whenever we land on (or leave) the walk slide
  };

  const onSolved = () => {
    markCompleted(problem.slug);
    saveLastPosition({ slug: problem.slug, slide: 0, total: slides.length, title: slides[0].title });
    api.sdSolve(getToken, problem.slug).catch(() => {});
    setStage("done");
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

  const stepLabel = slide < problem.slides.length ? "Primer" : isWalk ? "Walkthrough" : "Component";
  const progress = stage === "learn" ? (slide + 1) / (slides.length + 1) : 1;

  return (
    <ReaderPage
      crumbs={["Study", track, problem.title]}
      onClose={onClose}
      scrollKey={`${stage}-${slide}`}
      status={
        <>
          <span className="font-mono text-[13px] text-muted-foreground">
            {stage === "learn" ? `${slide + 1} / ${slides.length}` : stage === "build" ? "Build" : "Complete"}
          </span>
          <span className="hidden h-[3px] w-40 overflow-hidden rounded-sm bg-border sm:block">
            <span className="block h-full bg-accent" style={{ width: `${progress * 100}%` }} />
          </span>
        </>
      }
      aside={
        <ReaderNav label="Steps">
          {slides.map((s, i) => (
            <ReaderNavItem
              key={i}
              index={i}
              active={stage === "learn" && i === slide}
              done={i < furthest}
              disabled={i > furthest}
              onClick={() => {
                setStage("learn");
                goTo(i);
              }}
            >
              {s.title}
            </ReaderNavItem>
          ))}
          <ReaderNavItem
            active={stage !== "learn"}
            disabled={furthest < slides.length - 1}
            onClick={() => setStage("build")}
          >
            Build on the canvas
          </ReaderNavItem>
        </ReaderNav>
      }
    >
      {stage === "learn" && (
        <div className="mx-auto flex min-h-full max-w-[1100px] flex-col px-5 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-1 flex-col gap-10 xl:flex-row xl:items-start xl:gap-14">
            <article className="flex flex-col gap-5 xl:w-[46%]">
              <span className="eyebrow">
                Step {slide + 1} · {stepLabel}
              </span>
              <h1 className="m-0 font-display text-[clamp(34px,4vw,52px)] font-light leading-[1.05] tracking-[-0.02em]">
                {slides[slide].title}
              </h1>
              <p className="m-0 text-[17px] leading-[1.6] text-muted-foreground">{slides[slide].body}</p>

              {isWalk && (() => {
                const allEdges = [...problem.connections, ...(problem.returns ?? [])];
                const [ef, et] = allEdges[walkStep] ?? [];
                const isReturn = walkStep >= problem.connections.length;
                const why = ef ? problem.connectionWhy[`${ef}>${et}`] ?? `${nameOf(ef)} returns its response to ${nameOf(et)}.` : "";
                return (
                  <div className="border-t border-foreground pt-4">
                    <div className="flex items-center justify-between">
                      <span className="eyebrow">
                        Hop {walkStep + 1} of {totalSteps}
                      </span>
                      <div className="flex items-center gap-2">
                        <StepButton label="Previous hop" onClick={() => setWalkStep((s) => Math.max(0, s - 1))} disabled={walkStep === 0}>
                          <ArrowLeft className="h-4 w-4" />
                        </StepButton>
                        <StepButton
                          primary
                          label="Next hop"
                          onClick={() => setWalkStep((s) => Math.min(totalSteps - 1, s + 1))}
                          disabled={walkStep >= totalSteps - 1}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </StepButton>
                      </div>
                    </div>
                    {ef && (
                      <div className="mt-3">
                        <div className="font-display text-xl">
                          {nameOf(ef)} {isReturn ? "⇠" : "→"} {nameOf(et)}
                          <span className="eyebrow ml-2 align-middle">{isReturn ? "response" : "request"}</span>
                        </div>
                        <p className="m-0 mt-1 text-[15px] leading-relaxed text-muted-foreground">{why}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {slides[slide].bullets && (
                <ul className="m-0 list-none border-b border-border p-0">
                  {slides[slide].bullets!.map((b, i) => (
                    <li key={i} className="border-t border-border py-3.5 text-[15px] leading-relaxed first:border-t-foreground">
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {quiz && (
                <div className="flex flex-col gap-3 border-t border-foreground pt-4">
                  <span className="eyebrow">Check yourself</span>
                  <div className="font-display text-xl leading-snug">{quiz.prompt}</div>
                  <div className="flex flex-col">
                    {quiz.options.map((o, i) => {
                      const picked = answers[slide];
                      const isCorrect = o.id === quiz.correct;
                      const isPicked = picked === o.id;
                      let tone = "hover:bg-muted";
                      if (picked !== undefined) {
                        if (isCorrect) tone = "bg-accent/10 text-foreground";
                        else if (isPicked) tone = "bg-danger/10 text-foreground";
                        else tone = "opacity-50";
                      }
                      return (
                        <button
                          key={o.id}
                          type="button"
                          disabled={picked !== undefined}
                          onClick={() => setAnswers((a) => ({ ...a, [slide]: o.id }))}
                          className={`-mx-3 flex min-h-11 items-center gap-3 rounded-lg border-t border-border px-3 py-3 text-left text-[15px] transition-colors first:border-t-transparent ${tone}`}
                        >
                          <span className="font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                          <span className="flex-1">{o.label}</span>
                          {picked !== undefined && isCorrect && <Check className="h-4 w-4 text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                  {answers[slide] !== undefined && (
                    <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">
                      <span className={answers[slide] === quiz.correct ? "font-medium text-accent" : "font-medium text-danger"}>
                        {answers[slide] === quiz.correct ? "Correct. " : "Not quite. "}
                      </span>
                      {quiz.why}
                    </p>
                  )}
                </div>
              )}

              {currentType && (outgoing.length > 0 || incoming.length > 0) && (
                <div className="flex flex-col border-t border-foreground pt-4">
                  <span className="eyebrow pb-1">How it connects</span>
                  {outgoing.map(([f, t]) => (
                    <div key={`o${t}`} className="border-b border-border py-3 text-[15px] leading-snug">
                      <span className="font-medium">→ {nameOf(t)}</span>{" "}
                      <span className="text-muted-foreground">{problem.connectionWhy[`${f}>${t}`]}</span>
                    </div>
                  ))}
                  {incoming.map(([f, t]) => (
                    <div key={`i${f}`} className="border-b border-border py-3 text-[15px] leading-snug">
                      <span className="font-medium">← {nameOf(f)}</span>{" "}
                      <span className="text-muted-foreground">{problem.connectionWhy[`${f}>${t}`]}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <figure className="m-0 flex flex-col gap-3 xl:sticky xl:top-0 xl:flex-1">
              <span className="eyebrow">{slides[slide].art ? "Concept" : "The system so far"}</span>
              <div className="rounded-xl border border-border bg-card p-5 [&_svg]:mx-auto [&_svg]:max-h-[46dvh] xl:[&_svg]:max-h-[64dvh]">
                {slides[slide].art ? (
                  <ConceptDiagram id={slides[slide].art!} />
                ) : (
                  <SystemDiagram problem={problem} revealed={revealed} current={currentType} step={isWalk ? walkStep : undefined} />
                )}
              </div>
            </figure>
          </div>

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            {slide > 0 ? (
              <button type="button" onClick={() => goTo(slide - 1)} className="flex min-h-11 flex-col items-start gap-1 text-left">
                <span className="eyebrow">Previous</span>
                <span className="text-[15px] hover:text-accent">{slides[slide - 1].title}</span>
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => (last ? setStage("build") : goTo(slide + 1))}
              disabled={nextLocked}
              title={nextLocked ? "Answer the question to continue" : undefined}
              className="group flex min-h-11 items-center gap-3.5 text-right disabled:opacity-40"
            >
              <span className="flex flex-col items-end gap-1">
                <span className="eyebrow">{last ? "Ready" : "Next"}</span>
                <span className="text-[15px] group-hover:text-accent">{last ? "Start building" : slides[slide + 1].title}</span>
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-ink-foreground">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </footer>
        </div>
      )}

      {stage === "build" && (
        <div className="flex h-full flex-col gap-4 px-5 py-6 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="m-0 font-display text-[34px] font-light leading-tight">Build on the canvas</h1>
            {canvasOk && (
              <p className="m-0 text-sm text-muted-foreground">
                Drag every component onto the canvas and connect them into a working design, then check it.
              </p>
            )}
          </div>
          {canvasOk ? (
            <div className="min-h-[480px] flex-1">
              <SystemDesignCanvas problem={problem} onSolved={onSolved} />
            </div>
          ) : (
            <div className="flex max-w-xl flex-col items-start gap-4 rounded-xl border border-border bg-card p-6">
              <Monitor className="h-6 w-6 text-muted-foreground" />
              <p className="m-0 text-[17px] leading-relaxed">The design canvas needs a desktop.</p>
              <p className="m-0 text-sm text-muted-foreground">
                Open this module on your computer to build and check your design. Your place in the lessons is saved.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-ink-foreground transition-opacity hover:opacity-90"
              >
                Back to Study
              </button>
            </div>
          )}
        </div>
      )}

      {stage === "done" && (
        <div className="mx-auto flex min-h-full max-w-xl flex-col items-start justify-center gap-5 px-5 py-14 sm:px-10">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
            <Check className="h-6 w-6" />
          </span>
          <span className="eyebrow">{track} · Complete</span>
          <h1 className="m-0 font-display text-[clamp(36px,5vw,56px)] font-light leading-[1.04] tracking-[-0.02em]">
            {problem.title}
          </h1>
          <p className="m-0 text-[17px] leading-relaxed text-muted-foreground">
            Every component is placed and wired correctly. It now counts toward your design modules and the {track} leaderboard.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setStage("build")}
              className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Build again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-ink-foreground transition-opacity hover:opacity-90"
            >
              Back to Study
            </button>
          </div>
        </div>
      )}
    </ReaderPage>
  );
}
