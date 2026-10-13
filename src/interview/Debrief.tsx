import { useState } from "react";
import { useData } from "../data/context";
import { api, type CodingProgress, type Debrief as DebriefData, type Interview } from "../lib/api";
import { Button } from "../components/Controls";
import { CodeEditor } from "./CodeEditor";
import { MarkDot, MarkLegend, ProgressTable } from "./Marks";
import { AREAS, MARK_LABEL, VERDICTS, kindName, languageLabel, markTone, verdictLabel, verdictTone } from "./labels";

const CORRECTNESS = { likely_correct: "Likely correct", likely_wrong: "Likely wrong", unclear: "Unclear" };

function Heading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="m-0 font-display text-2xl font-normal">
      {children}
    </h2>
  );
}

function Followups({ iv, onUpdate }: { iv: Interview; onUpdate: (iv: Interview) => void }) {
  const { getToken } = useData();
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const ask = async (text: string) => {
    const msg = text.trim();
    if (!msg || waiting) return;
    setWaiting(true);
    setError("");
    try {
      onUpdate(await api.followup(getToken, iv.id, msg));
      setDraft("");
    } catch (e) {
      setError(String(e).includes("429") ? "You've used all the follow-ups for this interview." : "Couldn't send that. Try again.");
    } finally {
      setWaiting(false);
    }
  };
  return (
    <section aria-labelledby="ask" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Heading id="ask">Ask your interviewer</Heading>
        <p className="m-0 text-muted-foreground">It has the full transcript{iv.kind === "coding" ? " and your code" : ""}. Push back on a mark, or ask what it wanted.</p>
      </div>
      {iv.followups.map((t, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className={`text-[11px] font-medium uppercase tracking-[0.08em] ${t.role === "user" ? "text-muted-foreground" : "text-accent"}`}>
            {t.role === "user" ? "You" : "Interviewer"}
          </span>
          <p className={`m-0 whitespace-pre-wrap leading-relaxed ${t.role === "user" ? "text-sm" : "font-display text-[16px]"}`}>{t.content}</p>
        </div>
      ))}
      {waiting && <p className="m-0 text-[13px] italic text-muted-foreground">Interviewer is typing…</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
        className="flex flex-col gap-2.5"
      >
        <label className="sr-only" htmlFor="followup">
          Ask a follow-up
        </label>
        <textarea
          id="followup"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Why was that marked weak?"
          className="w-full resize-y rounded-lg border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-foreground"
        />
        {error && <p className="m-0 text-[13px] text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {["What would a strong hire have done?", "Quiz me on what I missed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void ask(s)}
              disabled={waiting}
              className="min-h-9 rounded-full border border-border px-3 text-[13px] text-foreground/80 hover:bg-muted disabled:opacity-50"
            >
              {s}
            </button>
          ))}
          <button
            type="submit"
            disabled={waiting || !draft.trim()}
            className="ml-auto inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-[13px] font-medium text-ink-foreground hover:opacity-90 disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </form>
    </section>
  );
}

function ReadOverTime({ turns }: { turns: Interview["turns"] }) {
  const reads = turns.flatMap((t, i) => (t.role === "assistant" && t.signals ? [{ turn: i + 1, signals: t.signals }] : []));
  if (reads.length < 2) return null;
  const last = reads[reads.length - 1].signals;
  return (
    <section aria-labelledby="read" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Heading id="read">How the read moved</Heading>
        <p className="m-0 text-muted-foreground">What the interviewer thought of each part after every turn, left to right.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <caption className="sr-only">Live read of each area after each interviewer turn, oldest first</caption>
          <tbody>
            {AREAS.map((a) => (
              <tr key={a} className="border-t border-border">
                <th scope="row" className="w-[140px] py-3 pr-4 text-left text-sm font-medium">
                  {a}
                </th>
                <td className="py-3 pr-4">
                  <span role="img" aria-label={`${a}: ${reads.map((r) => MARK_LABEL[r.signals[a]?.mark ?? "unseen"]).join(", ")}`} className="flex gap-1.5">
                    {reads.map((r) => {
                      const s = r.signals[a] ?? { mark: "unseen" as const, note: "" };
                      return (
                        <span key={r.turn} title={`Turn ${r.turn}: ${MARK_LABEL[s.mark]}${s.note ? `. ${s.note}` : ""}`}>
                          <MarkDot mark={s.mark} size="sm" />
                        </span>
                      );
                    })}
                  </span>
                </td>
                <td className="max-w-[320px] truncate py-3 text-[13px] text-muted-foreground" title={last[a]?.note}>
                  {last[a]?.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Debrief({
  iv,
  progress,
  onUpdate,
  onBack,
}: {
  iv: Interview & { debrief: DebriefData };
  progress: CodingProgress | null;
  onUpdate: (iv: Interview) => void;
  onBack: () => void;
}) {
  const d = iv.debrief;
  const [showRecord, setShowRecord] = useState(false);
  const at = VERDICTS.findIndex((v) => v.key === d.verdict);
  const minutes = Math.max(1, Math.round(iv.elapsedSeconds / 60));
  const coding = iv.kind === "coding";
  const trend = coding && progress?.areas.some((a) => a.points.length > 1);

  return (
    <div className="mx-auto flex max-w-[800px] flex-col gap-11">
      <button type="button" onClick={onBack} className="-mb-6 min-h-10 self-start text-sm text-muted-foreground hover:text-foreground">
        ← Interviews
      </button>
      <header className="flex flex-col gap-3.5">
        <span className="eyebrow">
          Debrief · {kindName(iv.kind)} · {iv.title} · {minutes} min · {iv.bar === "top" ? "Top-tier bar" : "Standard bar"}
        </span>
        <h1 className={`m-0 font-display text-[52px] font-normal leading-none ${verdictTone(d.verdict)}`}>{verdictLabel(d.verdict)}.</h1>
        <div role="img" aria-label={`Verdict scale, ${verdictLabel(d.verdict)} selected`} className="grid max-w-[520px] grid-cols-5 gap-1">
          {VERDICTS.map((v, i) => (
            <span key={v.key} className="flex flex-col gap-1.5">
              <span className={`h-1 rounded-sm ${i === at ? "bg-accent" : "bg-border"}`} />
              <span className={`text-xs ${i === at ? "text-foreground" : "text-muted-foreground"}`}>{v.label}</span>
            </span>
          ))}
        </div>
        <p className="m-0 text-base leading-relaxed text-foreground/85">{d.summary}</p>
        {d.change && (
          <div className="flex flex-col gap-1 rounded-lg bg-sky/40 px-[18px] py-3.5">
            <span className="eyebrow !text-accent">Since your last interviews</span>
            <span className="leading-relaxed">{d.change}</span>
          </div>
        )}
      </header>

      <section aria-labelledby="rubric">
        <Heading id="rubric">How each part went</Heading>
        <ul className="m-0 mt-3 list-none border-b border-border p-0">
          {d.rubric.map((r) => (
            <li
              key={r.area}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t border-border py-4 sm:grid-cols-[140px_64px_minmax(0,1fr)_64px] sm:items-baseline"
            >
              <span className="font-medium">{r.area}</span>
              <span className={`font-medium ${markTone(r.mark)}`}>{MARK_LABEL[r.mark]}</span>
              <span className="col-span-2 leading-relaxed text-foreground/85 sm:col-span-1">{r.evidence}</span>
              <span className="font-mono text-xs text-muted-foreground sm:text-right">{r.ref}</span>
            </li>
          ))}
        </ul>
      </section>

      {coding && <ReadOverTime turns={iv.turns} />}

      {d.correctness && d.complexity && (
        <section aria-label="Correctness and complexity" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
            <span className="eyebrow">Correctness · judged, not run</span>
            <span className={`font-display text-[22px] ${d.correctness.verdict === "likely_wrong" ? "text-danger" : "text-accent"}`}>
              {CORRECTNESS[d.correctness.verdict]}
            </span>
            {d.correctness.issues.length ? (
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed">
                {d.correctness.issues.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-muted-foreground">No issues found.</span>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
            <span className="eyebrow">Complexity</span>
            <dl className="m-0 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-muted-foreground">You said</dt>
              <dd className={`m-0 font-mono ${d.complexity.agrees ? "" : "text-danger"}`}>{d.complexity.stated}</dd>
              <dt className="text-muted-foreground">Actual</dt>
              <dd className="m-0 font-mono">{d.complexity.actual}</dd>
            </dl>
          </div>
        </section>
      )}

      <section aria-labelledby="moment" className="flex flex-col gap-4">
        <Heading id="moment">The moment to redo</Heading>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="eyebrow">You said</span>
            <p className="m-0 whitespace-pre-line leading-relaxed text-foreground/85">“{d.moment.said}”</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="eyebrow !text-accent">A stronger answer</span>
            <p className="m-0 whitespace-pre-line leading-relaxed text-foreground/85">“{d.moment.stronger}”</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="next">
        <Heading id="next">Before the next one</Heading>
        <ol className="m-0 mt-3 list-none border-b border-border p-0">
          {d.next.map((n, i) => (
            <li key={n} className="flex gap-4 border-t border-border py-3.5">
              <span className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="leading-relaxed">{n}</span>
            </li>
          ))}
        </ol>
      </section>

      {trend && progress && (
        <section aria-labelledby="trend" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <Heading id="trend">Your recent coding interviews</Heading>
            <MarkLegend />
          </div>
          <ProgressTable progress={progress} />
        </section>
      )}

      <Followups iv={iv} onUpdate={onUpdate} />

      <div className="flex flex-wrap gap-2.5">
        <Button onClick={onBack}>Start another</Button>
        <Button variant="secondary" onClick={() => setShowRecord(!showRecord)}>
          {showRecord ? "Hide the transcript" : coding ? "Read the transcript and code" : "Read the transcript"}
        </Button>
      </div>
      {showRecord && (
        <section aria-label="Transcript" className="-mt-4 flex flex-col gap-5">
          {iv.turns.map((t, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className={`text-[11px] font-medium uppercase tracking-[0.08em] ${t.role === "user" ? "text-muted-foreground" : "text-accent"}`}>
                Turn {i + 1} · {t.role === "user" ? "You" : t.unprompted ? "Interviewer, watching your code" : "Interviewer"}
              </span>
              <p className={`m-0 whitespace-pre-wrap leading-relaxed ${t.role === "user" ? "text-sm" : "font-display text-[16px]"}`}>{t.content}</p>
            </div>
          ))}
          {coding && iv.code && (
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Your code · {languageLabel(iv.language)}</span>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <CodeEditor value={iv.code} language={iv.language ?? "python"} label="Your final code" readOnly />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
