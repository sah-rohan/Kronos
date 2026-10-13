import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { useData } from "../data/context";
import { api, isConflict, type CodeLanguage, type Interview, type InterviewTurn } from "../lib/api";
import { leetcodeUrl } from "../lib/leetcode";
import { Button } from "../components/Controls";
import { Chat } from "./Chat";
import { CodeEditor } from "./CodeEditor";
import { LANGUAGES, kindName } from "./labels";

type SaveState = "saved" | "saving" | "unsaved" | "conflict" | "error";

const HINT = "/hint";
const SAVE_DELAY = 1500;
const WATCH_TICK = 10000;
const WATCH_GAP = 60000;
const QUIET_AFTER_MESSAGE = 45000;
const ACTIVE_WINDOW = 120000;

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Editing",
  conflict: "Changed in another tab",
  error: "Not saved, retrying",
};

function useClock(iv: Interview) {
  const [now, setNow] = useState(() => Date.now());
  const [loaded] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = iv.minutes * 60 - iv.elapsedSeconds - Math.floor((now - loaded) / 1000);
  if (left <= 0) return { text: "Time's up", over: true };
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  return { text: `${m}:${s} left`, over: false };
}

function ProblemPane({ iv }: { iv: Interview }) {
  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[26px] font-normal leading-tight">{iv.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          <span>{iv.difficulty}</span>
          {iv.subject && (
            <a href={leetcodeUrl(iv.subject)} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Official statement
            </a>
          )}
        </div>
      </div>
      {iv.problem ? (
        <>
          <p className="m-0 whitespace-pre-line leading-relaxed">{iv.problem.statement}</p>
          {iv.problem.examples.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Examples</span>
              {iv.problem.examples.map((x) => (
                <pre key={x} className="m-0 whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 font-mono text-[12.5px]">
                  {x}
                </pre>
              ))}
            </div>
          )}
          {iv.problem.constraints.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Constraints</span>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 font-mono text-[12.5px]">
                {iv.problem.constraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="m-0 text-muted-foreground">The interviewer will describe the problem in the chat.</p>
      )}
    </div>
  );
}

export function Room({ iv, onUpdate, onLeave }: { iv: Interview; onUpdate: (iv: Interview) => void; onLeave: () => void }) {
  const { getToken } = useData();
  const coding = iv.kind === "coding";
  const clock = useClock(iv);
  const [code, setCode] = useState(iv.code);
  const [language, setLanguage] = useState<CodeLanguage>(iv.language ?? "python");
  const [save, setSave] = useState<SaveState>("saved");
  const [waiting, setWaiting] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);

  const version = useRef(iv.codeVersion);
  const rev = useRef(0);
  const saved = useRef(0);
  const latest = useRef({ code, language });
  useLayoutEffect(() => {
    latest.current = { code, language };
  });
  const inflight = useRef<Promise<boolean> | null>(null);
  const lastEdit = useRef(0);
  const lastWatch = useRef(0);
  const lastMessage = useRef(0);
  const watchedRev = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    lastWatch.current = lastMessage.current = Date.now();
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (!coding) return true;
    while (inflight.current) await inflight.current;
    if (rev.current === saved.current) return true;
    const at = rev.current;
    setSave("saving");
    inflight.current = api
      .saveCode(getToken, iv.id, { ...latest.current, version: version.current })
      .then((r) => {
        version.current = r.version;
        saved.current = at;
        setSave(rev.current === at ? "saved" : "unsaved");
        return true;
      })
      .catch((e) => {
        setSave(isConflict(e) ? "conflict" : "error");
        return false;
      })
      .finally(() => {
        inflight.current = null;
      });
    return inflight.current;
  }, [coding, getToken, iv.id]);

  const edit = (next: string, lang = language) => {
    rev.current += 1;
    lastEdit.current = Date.now();
    setCode(next);
    setLanguage(lang);
    setSave("unsaved");
  };

  useEffect(() => {
    if (save !== "unsaved" && save !== "error") return;
    const t = setTimeout(flush, save === "error" ? 10000 : SAVE_DELAY);
    return () => clearTimeout(t);
  }, [code, language, save, flush]);

  useEffect(() => () => void flush(), [flush]);

  useEffect(() => {
    if (!coding) return;
    const t = setInterval(async () => {
      const now = Date.now();
      if (
        busy.current ||
        rev.current === watchedRev.current ||
        now - lastEdit.current > ACTIVE_WINDOW ||
        now - lastWatch.current < WATCH_GAP ||
        now - lastMessage.current < QUIET_AFTER_MESSAGE
      )
        return;
      busy.current = true;
      lastWatch.current = now;
      try {
        if (!(await flush())) return;
        watchedRev.current = saved.current;
        onUpdate(await api.observe(getToken, iv.id, version.current));
      } catch {
        /* a skipped or failed watch check is silent */
      } finally {
        busy.current = false;
      }
    }, WATCH_TICK);
    return () => clearInterval(t);
  }, [coding, flush, getToken, iv.id, onUpdate]);

  const send = async (message: string): Promise<boolean> => {
    setError("");
    setWaiting(true);
    setPending(message === HINT ? "Asked for a hint." : message);
    busy.current = true;
    lastMessage.current = Date.now();
    try {
      if (!(await flush())) throw new Error("save");
      onUpdate(await api.sendTurn(getToken, iv.id, message, version.current));
      return true;
    } catch (e) {
      const msg = String(e);
      setError(
        msg.includes("504")
          ? "The interviewer took too long. Send that again."
          : msg.includes("429")
            ? "This interview has reached its turn limit. End it to get your grade."
            : isConflict(e)
              ? "Your code changed in another tab. Reload to continue."
              : "Couldn't send that. Try again.",
      );
      return false;
    } finally {
      setWaiting(false);
      setPending(null);
      busy.current = false;
    }
  };

  const end = async () => {
    if (!window.confirm("End the interview? Your grade will be ready in about a minute.")) return;
    setEnding(true);
    try {
      await flush();
      onUpdate(await api.endInterview(getToken, iv.id));
    } catch {
      setError("Couldn't end the interview. Try again.");
      setEnding(false);
    }
  };

  const turns: InterviewTurn[] = pending ? [...iv.turns, { role: "user", content: pending, at: new Date().toISOString() }] : iv.turns;
  const chat = (
    <Chat
      turns={turns}
      waiting={waiting}
      error={error}
      disabled={ending}
      onSend={send}
      onHint={coding ? () => void send(HINT) : undefined}
      placeholder={coding ? "Talk through your thinking…" : "Answer the interviewer…"}
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-card px-4 py-1.5">
        <button type="button" onClick={onLeave} className="flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Interviews
        </button>
        <span className="font-display text-lg">Kronos</span>
        <span className="truncate text-[13px] text-muted-foreground">
          {kindName(iv.kind)} interview · {coding ? `${iv.difficulty} · ` : ""}
          {iv.bar === "top" ? "Top-tier bar" : "Standard bar"}
        </span>
        <span className={`ml-auto flex items-center gap-1.5 font-mono text-sm ${clock.over ? "text-danger" : ""}`}>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {clock.text}
        </span>
        <Button variant="secondary" onClick={end} disabled={ending}>
          {ending ? "Ending…" : "End interview"}
        </Button>
      </header>

      {coding ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.5fr)_minmax(340px,1fr)] lg:overflow-hidden">
          <section aria-label="Problem" className="min-h-0 border-b border-border lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <ProblemPane iv={iv} />
          </section>
          <section aria-label="Code editor" className="flex h-[70vh] min-h-0 flex-col border-b border-border lg:h-auto lg:border-b-0 lg:border-r">
            <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
              <label className="sr-only" htmlFor="room-language">
                Language
              </label>
              <select
                id="room-language"
                value={language}
                onChange={(e) => edit(code, e.target.value as CodeLanguage)}
                className="min-h-8 rounded-md border border-border-strong bg-card px-2 text-[13px]"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
              <span
                role="status"
                className={`ml-auto flex items-center gap-1.5 text-xs ${save === "conflict" || save === "error" ? "text-danger" : "text-muted-foreground"}`}
              >
                {save === "saved" && <Check className="h-3.5 w-3.5 text-accent" />}
                {SAVE_LABEL[save]} · the interviewer can see your code
              </span>
            </div>
            <div className="min-h-0 flex-1 bg-card">
              <CodeEditor
                value={code}
                language={language}
                onChange={(v) => edit(v)}
                label="Code editor"
                placeholder="Think out loud in comments, then write your code."
              />
            </div>
          </section>
          <section aria-label="Interviewer" className="h-[80vh] min-h-0 bg-sidebar lg:h-auto">
            {chat}
          </section>
        </div>
      ) : (
        <div className="mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col">{chat}</div>
      )}
    </div>
  );
}
