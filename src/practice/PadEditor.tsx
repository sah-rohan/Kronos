import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Code2, Plus, Trash2 } from "lucide-react";
import { useData } from "../data/context";
import { api, isConflict, type Pad, type PadBlock, type PadLanguage } from "../lib/api";
import { leetcodeUrl } from "../lib/leetcode";
import { readJSON, write } from "../lib/storage";
import { Button } from "../components/Controls";
import { CodeEditor } from "./CodeEditor";
import { AREAS, LANGUAGES, languageLabel, minutesBetween } from "./rubric";

type SaveState = "saved" | "saving" | "unsaved" | "conflict" | "error";
type Backup = { version: number; blocks: PadBlock[]; language: PadLanguage };

const MAX_BLOCKS = 60;
const backupKey = (id: string) => `kronos:pad:${id}`;
const clearBackup = (id: string) => {
  try {
    localStorage.removeItem(backupKey(id));
  } catch {
    /* storage unavailable */
  }
};

function Note({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      placeholder={placeholder}
      rows={2}
      className="w-full resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-1 py-2.5 font-display text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground hover:border-border focus:border-border-strong focus:bg-card"
    />
  );
}

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  conflict: "Changed in another tab",
  error: "Not saved, retrying",
};

export function PadEditor({ pad, focus, onUpdate, onBack }: { pad: Pad; focus: string; onUpdate: (p: Pad) => void; onBack: () => void }) {
  const { getToken } = useData();
  const [blocks, setBlocks] = useState<PadBlock[]>(() => {
    const b = readJSON<Backup | null>(backupKey(pad.id), null);
    return b && b.version === pad.version ? b.blocks : pad.blocks;
  });
  const [language, setLanguage] = useState<PadLanguage>(() => {
    const b = readJSON<Backup | null>(backupKey(pad.id), null);
    return b && b.version === pad.version ? b.language : pad.language;
  });
  const [state, setState] = useState<SaveState>("saved");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(pad.version);
  const rev = useRef(0);
  const saved = useRef(0);
  const latest = useRef({ blocks, language });
  useLayoutEffect(() => {
    latest.current = { blocks, language };
  });
  const inflight = useRef<Promise<boolean> | null>(null);
  const nextKey = useRef(blocks.length);
  const [keys, setKeys] = useState(() => blocks.map((_, i) => i));

  const flush = useCallback(async (): Promise<boolean> => {
    while (inflight.current) await inflight.current;
    if (rev.current === saved.current) return true;
    const at = rev.current;
    const body = { ...latest.current, version: version.current };
    setState("saving");
    inflight.current = api
      .savePad(getToken, pad.id, body)
      .then((r) => {
        version.current = r.version;
        saved.current = at;
        if (rev.current === at) {
          clearBackup(pad.id);
          setState("saved");
        } else {
          setState("unsaved");
        }
        return true;
      })
      .catch((e) => {
        setState(isConflict(e) ? "conflict" : "error");
        return false;
      })
      .finally(() => {
        inflight.current = null;
      });
    return inflight.current;
  }, [getToken, pad.id]);

  const edit = (next: PadBlock[], lang = language) => {
    rev.current += 1;
    setBlocks(next);
    setLanguage(lang);
    setState("unsaved");
    write(backupKey(pad.id), JSON.stringify({ version: version.current, blocks: next, language: lang } satisfies Backup));
  };

  useEffect(() => {
    if (state !== "unsaved" && state !== "error") return;
    const t = setTimeout(flush, state === "error" ? 10000 : 2000);
    return () => clearTimeout(t);
  }, [blocks, language, state, flush]);

  useEffect(() => {
    if (pad.blocks !== blocks && rev.current === 0 && readJSON<Backup | null>(backupKey(pad.id), null)) {
      rev.current = 1;
      setState("unsaved");
    }
    const leave = () => void flush();
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      void flush();
    };
    // Mount/unmount only: restores a local backup and saves on the way out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setText = (i: number, text: string) => edit(blocks.map((b, j) => (j === i ? { ...b, text } : b)));
  const add = (kind: PadBlock["kind"]) => {
    setKeys([...keys, nextKey.current++]);
    edit([...blocks, { kind, text: "", at: new Date().toISOString() }]);
  };
  const remove = (i: number) => {
    setKeys(keys.filter((_, j) => j !== i));
    edit(blocks.filter((_, j) => j !== i));
  };

  const reload = async () => {
    const fresh = await api.pad(getToken, pad.id);
    clearBackup(pad.id);
    rev.current = 0;
    saved.current = 0;
    onUpdate(fresh);
  };

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      if (!(await flush())) throw new Error("save");
      onUpdate(await api.submitPad(getToken, pad.id));
    } catch (e) {
      const msg = String(e);
      setError(
        msg.includes("429")
          ? "You've hit today's limit of 10 submits. Try again tomorrow."
          : msg.includes("400")
            ? "Write something before submitting."
            : "Couldn't submit. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasContent = blocks.some((b) => b.text.trim() !== "");

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border pb-5">
        <button type="button" onClick={onBack} className="min-h-10 text-sm text-muted-foreground hover:text-foreground">
          ← Practice
        </button>
        <span className="text-sm text-muted-foreground">
          {pad.difficulty} · {pad.category}
          {pad.attempt > 1 ? ` · Attempt ${pad.attempt}` : ""}
        </span>
        <span role="status" className={`ml-auto flex items-center gap-2 text-[13px] ${state === "conflict" || state === "error" ? "text-danger" : "text-muted-foreground"}`}>
          {state === "saved" && <Check className="h-3.5 w-3.5 text-accent" />}
          {SAVE_LABEL[state]} · {minutesBetween(pad.startedAt)} min in
        </span>
        {state === "conflict" && (
          <Button variant="secondary" onClick={reload}>
            Load the latest
          </Button>
        )}
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Language
          <select
            value={language}
            onChange={(e) => edit(blocks, e.target.value as PadLanguage)}
            className="min-h-10 rounded-full border border-border-strong bg-card px-3 text-foreground"
          >
            {LANGUAGES.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={submit} disabled={submitting || !hasContent || state === "conflict"}>
          {submitting ? "Submitting…" : "Submit for feedback"}
        </Button>
      </header>
      {error && <p className="-mt-4 m-0 text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <aside className="flex flex-col gap-7 lg:sticky lg:top-6 lg:w-[280px] lg:shrink-0">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-[30px] font-normal leading-tight">{pad.title}</h1>
            <a href={leetcodeUrl(pad.slug)} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
              Read the problem on LeetCode
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="eyebrow">Graded on</span>
            {AREAS.map((a) => (
              <div key={a.name} className="flex flex-col">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-[13px] leading-snug text-muted-foreground">{a.hint}</span>
              </div>
            ))}
          </div>
          {focus && (
            <div className="flex flex-col gap-1.5 border-t border-border pt-5">
              <span className="eyebrow !text-danger">Your focus</span>
              <span className="text-sm leading-relaxed">{focus} has been weak most often in your recent pads. Get it on the page this time.</span>
            </div>
          )}
        </aside>

        <section aria-label="Scratchpad" className="flex min-w-0 flex-1 flex-col gap-3">
          {blocks.map((b, i) => (
            <div key={keys[i]} className="group grid grid-cols-[32px_minmax(0,1fr)_40px] gap-2">
              <span className="pt-3.5 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              {b.kind === "note" ? (
                <Note
                  value={b.text}
                  onChange={(v) => setText(i, v)}
                  label={`Note block ${i + 1}`}
                  placeholder={i === 0 ? "Restate the problem and its constraints." : "Explain what you're doing and why…"}
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="border-b border-border px-3.5 py-2 text-xs text-muted-foreground">Code · {languageLabel(language)}</div>
                  <CodeEditor value={b.text} language={language} onChange={(v) => setText(i, v)} label={`Code block ${i + 1}`} />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Delete block ${i + 1}`}
                className="mt-1.5 grid h-10 w-10 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted hover:text-danger focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2.5 pl-10">
            <Button variant="secondary" onClick={() => add("note")} disabled={blocks.length >= MAX_BLOCKS}>
              <Plus className="h-4 w-4" /> Note
            </Button>
            <Button variant="secondary" onClick={() => add("code")} disabled={blocks.length >= MAX_BLOCKS}>
              <Code2 className="h-4 w-4" /> Code
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
