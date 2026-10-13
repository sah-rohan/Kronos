import { useRef, useState } from "react";
import { Star, Trash2, Upload } from "lucide-react";
import { api, type ApiResume, type TokenFn } from "../lib/api";

// Text formats a resume is actually written in. A PDF would need parsing the
// backend does not do, so it is not offered rather than silently storing bytes
// the model cannot read.
const ACCEPT = ".txt,.md,.markdown,.tex,.json";

export function ResumesTab({
  token,
  resumes,
  onChanged,
}: {
  token: TokenFn;
  resumes: ApiResume[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<ApiResume | null>(null);
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const startNew = () => {
    setEditing({ id: "", label: "", primary: false, chars: 0, updatedAt: "" });
    setLabel("");
    setContent("");
    setError("");
  };

  const startEdit = async (r: ApiResume) => {
    setError("");
    const full = await api.resume(token, r.id).catch(() => null);
    if (!full) return setError("Could not load that resume.");
    setEditing(full);
    setLabel(full.label);
    setContent(full.content ?? "");
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setContent(await f.text());
    if (!label) setLabel(f.name.replace(/\.[^.]+$/, ""));
  };

  const save = async () => {
    if (!content.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.saveResume(token, { id: editing?.id || undefined, label, content });
      setEditing(null);
      onChanged();
    } catch {
      setError("Could not save. The file may be too large (200 KB max).");
    }
    setBusy(false);
  };

  if (editing) {
    return (
      <div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label, e.g. Backend 2026"
          className="w-full rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => file.current?.click()}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium transition hover:bg-muted"
          >
            <Upload className="h-3.5 w-3.5" /> Load a file
          </button>
          <span className="text-[11px] text-muted-foreground">.txt, .md, .tex — or paste below</span>
          <input
            ref={file}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your resume…"
          className="mt-3 h-80 w-full resize-none rounded-2xl border border-border bg-background/60 p-4 font-mono text-xs leading-relaxed focus:outline-none"
        />
        {error && <p className="mt-3 text-xs text-coral">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            disabled={busy || !content.trim()}
            className="rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(null)}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        The coach reads your primary resume on every question. Keep more than one if you tailor them.
      </p>
      <ul className="mt-4 space-y-2">
        {resumes.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
          >
            <button onClick={() => startEdit(r)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium">{r.label}</div>
              <div className="text-[11px] text-muted-foreground">
                {r.chars.toLocaleString()} characters · updated {r.updatedAt.slice(0, 10)}
              </div>
            </button>
            <button
              onClick={() => api.setPrimaryResume(token, r.id).then(onChanged)}
              title={r.primary ? "Primary" : "Make primary"}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                r.primary ? "text-coral" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Star className={`h-4 w-4 ${r.primary ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={() => api.deleteResume(token, r.id).then(onChanged)}
              title="Delete"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {resumes.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No resume on file yet.
          </li>
        )}
      </ul>
      <button
        onClick={startNew}
        className="mt-4 rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95"
      >
        Add a resume
      </button>
    </div>
  );
}
