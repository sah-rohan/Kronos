import { useRef, useState } from "react";
import { api, type ApiResume, type TokenFn } from "../lib/api";

const ACCEPT = ".txt,.md,.markdown,.tex,.json";

const linkButton = "min-h-9 text-[13px] text-muted-foreground transition-colors hover:text-accent";

export function ResumeShelf({ token, resumes, onChanged }: { token: TokenFn; resumes: ApiResume[] | null; onChanged: () => void }) {
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const open = async (r?: ApiResume) => {
    setError("");
    if (!r) {
      setLabel("");
      setContent("");
      return setEditing({ id: "" });
    }
    const full = await api.resume(token, r.id).catch(() => null);
    if (!full) return setError("Couldn't load that resume.");
    setLabel(full.label);
    setContent(full.content ?? "");
    setEditing({ id: r.id });
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setContent(await f.text());
    if (!label) setLabel(f.name.replace(/\.[^.]+$/, ""));
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api.saveResume(token, { id: editing?.id || undefined, label: label.trim() || "Resume", content });
      setEditing(null);
      onChanged();
    } catch {
      setError("Couldn't save. The resume may be over 200 KB.");
    }
    setBusy(false);
  };

  const run = (p: Promise<unknown>) => p.then(onChanged).catch(() => setError("Something went wrong. Try again."));

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={100}
          placeholder="Label, e.g. Backend 2026"
          className="min-h-10 rounded-lg border border-border-strong bg-card px-3 text-sm outline-none focus:border-foreground"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => file.current?.click()}
            className="min-h-9 rounded-lg border border-border-strong px-3 text-[13px] transition hover:bg-muted"
          >
            Load a file
          </button>
          <span className="text-[13px] text-muted-foreground">.txt, .md or .tex. For a PDF, copy the text and paste it below.</span>
          <input ref={file} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your resume…"
          className="h-72 resize-y rounded-lg border border-border-strong bg-card p-3 font-mono text-xs leading-relaxed outline-none focus:border-foreground"
        />
        {error && <p className="m-0 text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy || !content.trim()}
            className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-ink-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save resume"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="inline-flex min-h-10 items-center rounded-full border border-border-strong px-5 text-sm transition hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted-foreground">Your resumes</span>
      {resumes && resumes.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">No resume yet. Add one to start this interview.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {resumes?.map((r) => (
            <li key={r.id} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{r.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {r.primary ? "Used for interviews · " : ""}
                  {r.chars.toLocaleString()} characters
                </span>
              </span>
              {!r.primary && (
                <button type="button" onClick={() => run(api.setPrimaryResume(token, r.id))} className={linkButton}>
                  Use this one
                </button>
              )}
              <button type="button" onClick={() => open(r)} className={linkButton}>
                Edit
              </button>
              <button type="button" onClick={() => run(api.deleteResume(token, r.id))} className={linkButton}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="m-0 text-sm text-danger">{error}</p>}
      <button type="button" onClick={() => open()} className="self-start min-h-9 text-[13px] font-medium text-accent hover:underline">
        + Add a resume
      </button>
    </div>
  );
}
