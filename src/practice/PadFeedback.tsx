import { useState } from "react";
import type { Pad, PadFeedback as Feedback, PadProgress } from "../lib/api";
import { Button } from "../components/Controls";
import { CodeEditor } from "./CodeEditor";
import { MarkLegend, ProgressTable } from "./Marks";
import { MARK_LABEL, languageLabel, markTone, minutesBetween } from "./rubric";

const VERDICT: Record<Feedback["correctness"]["verdict"], string> = {
  likely_correct: "Likely correct",
  likely_wrong: "Likely wrong",
  unclear: "Unclear",
};

function Heading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="m-0 font-display text-2xl font-normal">
      {children}
    </h2>
  );
}

function PadBlocks({ pad }: { pad: Pad }) {
  return (
    <div className="flex flex-col gap-3">
      {pad.blocks.map((b, i) => (
        <div key={i} id={`block-${i + 1}`} className="grid scroll-mt-6 grid-cols-[32px_minmax(0,1fr)] gap-2">
          <span className="pt-3 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
          {b.kind === "note" ? (
            <p className="m-0 whitespace-pre-line py-2.5 font-display text-[17px] leading-relaxed">{b.text || "—"}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <CodeEditor value={b.text} language={pad.language} label={`Code block ${i + 1}`} readOnly />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function PadFeedback({
  pad,
  progress,
  onRedo,
  onBack,
}: {
  pad: Pad & { feedback: Feedback };
  progress: PadProgress | null;
  onRedo: () => void;
  onBack: () => void;
}) {
  const f = pad.feedback;
  const [showPad, setShowPad] = useState(false);
  const rewritten = f.rewrite.block > 0 ? pad.blocks[f.rewrite.block - 1] : undefined;
  const jump = (block: number) => {
    setShowPad(true);
    requestAnimationFrame(() => document.getElementById(`block-${block}`)?.scrollIntoView({ behavior: "smooth" }));
  };
  const graded = progress?.areas.some((a) => a.points.length > 1);

  return (
    <div className="mx-auto flex max-w-[800px] flex-col gap-11">
      <button type="button" onClick={onBack} className="-mb-6 min-h-10 self-start text-sm text-muted-foreground hover:text-foreground">
        ← Practice
      </button>
      <header className="flex flex-col gap-3.5">
        <span className="eyebrow">
          Practice · {pad.title} · {languageLabel(pad.language)} · {minutesBetween(pad.startedAt, pad.submittedAt)} min
          {pad.attempt > 1 ? ` · Attempt ${pad.attempt}` : ""}
        </span>
        <h1 className={`m-0 font-display text-[52px] font-normal leading-none ${markTone(f.overall)}`}>{MARK_LABEL[f.overall]}.</h1>
        <p className="m-0 text-base leading-relaxed text-foreground/85">{f.summary}</p>
        {f.change && (
          <div className="flex flex-col gap-1 rounded-lg bg-sky/40 px-[18px] py-3.5">
            <span className="eyebrow !text-accent">Since your last attempts</span>
            <span className="leading-relaxed">{f.change}</span>
          </div>
        )}
      </header>

      <section aria-labelledby="rubric" className="flex flex-col">
        <Heading id="rubric">How each part went</Heading>
        <ul className="m-0 mt-3 list-none border-b border-border p-0">
          {f.rubric.map((r) => (
            <li key={r.area} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t border-border py-4 sm:grid-cols-[140px_64px_minmax(0,1fr)_64px] sm:items-baseline">
              <span className="font-medium">{r.area}</span>
              <span className={`font-medium sm:order-none ${markTone(r.mark)}`}>{MARK_LABEL[r.mark]}</span>
              <span className="col-span-2 leading-relaxed text-foreground/85 sm:col-span-1">{r.evidence}</span>
              {r.block > 0 ? (
                <button type="button" onClick={() => jump(r.block)} className="min-h-8 text-left font-mono text-xs text-accent hover:underline sm:text-right">
                  Block {r.block}
                </button>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Correctness and complexity" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
          <span className="eyebrow">Correctness · judged, not run</span>
          <span className={`font-display text-[22px] ${f.correctness.verdict === "likely_wrong" ? "text-danger" : "text-accent"}`}>
            {VERDICT[f.correctness.verdict]}
          </span>
          {f.correctness.issues.length ? (
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed">
              {f.correctness.issues.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-muted-foreground">No issues found.</span>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
          <span className="eyebrow">Complexity</span>
          <dl className="m-0 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1.5 font-mono text-[13px]">
            <dt className="text-muted-foreground">You said</dt>
            <dd className={`m-0 ${f.complexity.agrees ? "" : "text-danger"}`}>{f.complexity.stated}</dd>
            <dt className="text-muted-foreground">Actual</dt>
            <dd className="m-0">{f.complexity.actual}</dd>
          </dl>
        </div>
      </section>

      {f.rewrite.stronger && (
        <section aria-labelledby="rewrite" className="flex flex-col gap-4">
          <Heading id="rewrite">{rewritten ? `Block ${f.rewrite.block}, written stronger` : "Written stronger"}</Heading>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {rewritten && (
              <div className="flex flex-col gap-2">
                <span className="eyebrow">You wrote</span>
                <p className="m-0 whitespace-pre-line leading-relaxed text-foreground/85">{rewritten.text}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="eyebrow !text-accent">A strong candidate</span>
              <p className="m-0 whitespace-pre-line leading-relaxed text-foreground/85">{f.rewrite.stronger}</p>
            </div>
          </div>
        </section>
      )}

      {progress && graded && (
        <section aria-labelledby="trend" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <Heading id="trend">Your recent pads</Heading>
            <MarkLegend />
          </div>
          <ProgressTable progress={progress} />
        </section>
      )}

      <section aria-labelledby="next" className="flex flex-col">
        <Heading id="next">Before the next pad</Heading>
        <ol className="m-0 mt-3 list-none border-b border-border p-0">
          {f.next.map((n, i) => (
            <li key={n} className="flex gap-4 border-t border-border py-3.5">
              <span className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="leading-relaxed">{n}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-2.5">
        <Button onClick={onRedo}>Redo this problem</Button>
        <Button variant="secondary" onClick={() => setShowPad(!showPad)}>
          {showPad ? "Hide my pad" : "View my pad"}
        </Button>
      </div>
      {showPad && (
        <section aria-label="Your pad" className="-mt-4">
          <PadBlocks pad={pad} />
        </section>
      )}
    </div>
  );
}
