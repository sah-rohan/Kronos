import { useEffect, useRef, useState } from "react";
import type { InterviewTurn } from "../lib/api";

const HINT_SAID = "Asked for a hint.";

function Message({ turn }: { turn: InterviewTurn }) {
  if (turn.role === "user" && turn.content === HINT_SAID) {
    return <p className="m-0 self-end text-xs italic text-muted-foreground">You asked for a hint</p>;
  }
  const mine = turn.role === "user";
  return (
    <div className="flex flex-col gap-1">
      <span className={`flex items-baseline gap-2 text-[11px] font-medium uppercase tracking-[0.08em] ${mine ? "text-muted-foreground" : "text-accent"}`}>
        {mine ? "You" : "Interviewer"}
        {turn.unprompted && <span className="normal-case tracking-normal text-muted-foreground">· watching your code</span>}
      </span>
      <p className={`m-0 whitespace-pre-wrap leading-relaxed ${mine ? "text-sm" : "font-display text-[16px]"}`}>{turn.content}</p>
      {turn.code && (
        <pre className="m-0 mt-1 overflow-x-auto rounded-lg border border-border bg-card p-3 font-mono text-xs">{turn.code}</pre>
      )}
    </div>
  );
}

export function Chat({
  turns,
  waiting,
  error,
  disabled,
  onSend,
  onHint,
  placeholder = "Talk through your thinking…",
}: {
  turns: InterviewTurn[];
  waiting: boolean;
  error: string;
  disabled: boolean;
  onSend: (message: string) => Promise<boolean>;
  onHint?: () => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns.length, waiting]);

  const send = async () => {
    const msg = draft.trim();
    if (!msg || waiting || disabled) return;
    setDraft("");
    if (!(await onSend(msg))) setDraft(msg);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {turns.map((t, i) => (
          <Message key={i} turn={t} />
        ))}
        {waiting && <p className="m-0 text-[13px] italic text-muted-foreground">Interviewer is typing…</p>}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex shrink-0 flex-col gap-2.5 border-t border-border px-5 py-4"
      >
        {error && <p className="m-0 text-[13px] text-danger">{error}</p>}
        <label className="sr-only" htmlFor="interview-say">
          Message the interviewer
        </label>
        <textarea
          id="interview-say"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg border border-border-strong bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground disabled:opacity-60"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={waiting || disabled || !draft.trim()}
            className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-[13px] font-medium text-ink-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
          <span className="text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line</span>
          {onHint && (
            <button
              type="button"
              onClick={onHint}
              disabled={waiting || disabled}
              className="ml-auto min-h-10 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Ask for a hint
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
