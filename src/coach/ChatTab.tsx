import { useEffect, useRef, useState } from "react";
import { SendHorizontal, Trash2 } from "lucide-react";
import { api, type ApiJob, type CoachTurn, type TokenFn } from "../lib/api";

// Openers that only make sense because the coach can see the member's record.
const PROMPTS = [
  "What should I solve next, and why?",
  "Find the weakest pattern in my recent solutions.",
  "Rewrite my resume bullets using what I've actually built.",
  "Given this role, what am I most likely to be asked?",
];

export function ChatTab({
  token,
  jobs,
  available,
}: {
  token: TokenFn;
  jobs: ApiJob[];
  available: boolean;
}) {
  const [jobId, setJobId] = useState("");
  const [turns, setTurns] = useState<CoachTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [read, setRead] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  // Each role is its own thread, so switching the target reloads the history.
  useEffect(() => {
    api.coachHistory(token, jobId).then(setTurns).catch(() => setTurns([]));
  }, [token, jobId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, thinking]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || thinking) return;
    setDraft("");
    setError("");
    // Show the question immediately; the stored copy arrives with the reply.
    setTurns((t) => [...t, { role: "user", content: message, at: "" }]);
    setThinking(true);
    try {
      const r = await api.coachChat(token, message, jobId);
      setTurns((t) => [...t, { role: "assistant", content: r.reply, at: "" }]);
      setRead(
        [
          `${r.solved} solved`,
          `${r.code} of your solutions`,
          r.resume ? `resume "${r.resume}"` : "no resume",
          r.job || null,
        ]
          .filter(Boolean)
          .join(" · "),
      );
    } catch (e) {
      setError(
        String(e).includes("503")
          ? "The coach is not configured on this deployment yet."
          : "That did not go through. Try again.",
      );
      setTurns((t) => t.slice(0, -1));
    }
    setThinking(false);
  };

  const clear = async () => {
    await api.coachClear(token, jobId).catch(() => {});
    setTurns([]);
    setRead("");
  };

  if (!available) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        The coach is not configured on this deployment yet.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2">
        <select
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setRead("");
          }}
          className="min-w-0 flex-1 rounded-full border border-border bg-background/60 px-4 py-2 text-sm focus:outline-none"
        >
          <option value="">General interview prep</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.company} — {j.title}
            </option>
          ))}
        </select>
        {turns.length > 0 && (
          <button
            onClick={clear}
            title="Clear this thread"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 min-h-64 flex-1 space-y-4 overflow-y-auto">
        {turns.length === 0 && !thinking && (
          <div>
            <p className="text-sm text-muted-foreground">
              It has read every problem you solved this season, the code you submitted, the modules you
              finished, your resume, and the roles you are tracking. Ask it something that needs all of that.
            </p>
            <div className="mt-4 grid gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-2xl border border-border px-4 py-3 text-left text-sm transition hover:bg-muted"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                t.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-coral px-4 py-2.5 text-sm text-coral-foreground"
                  : "max-w-full whitespace-pre-wrap rounded-2xl border border-border px-4 py-3 text-sm leading-relaxed"
              }
            >
              {t.content}
            </div>
          </div>
        ))}

        {thinking && <div className="text-sm text-muted-foreground">Reading your record…</div>}
        <div ref={bottom} />
      </div>

      {read && <p className="mt-3 text-[11px] text-muted-foreground">Read: {read}</p>}
      {error && <p className="mt-3 text-xs text-coral">{error}</p>}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={2}
          placeholder="Ask about your solves, your code, your resume, or a role…"
          className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background/60 px-4 py-2.5 text-sm focus:outline-none"
        />
        <button
          onClick={() => send(draft)}
          disabled={thinking || !draft.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
