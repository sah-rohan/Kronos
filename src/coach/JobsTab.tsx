import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api, JOB_STATUSES, type ApiJob, type JobStatus, type TokenFn } from "../lib/api";

const STATUS_TONE: Record<JobStatus, string> = {
  saved: "bg-muted text-muted-foreground",
  applied: "bg-sky/20 text-sky-foreground",
  interviewing: "bg-coral/15 text-coral",
  offer: "bg-[#3fae6a]/15 text-[#3fae6a]",
  rejected: "bg-muted text-muted-foreground line-through",
};

const blank: Partial<ApiJob> = { company: "", title: "", location: "", url: "", description: "", status: "saved" };

export function JobsTab({
  token,
  jobs,
  onChanged,
}: {
  token: TokenFn;
  jobs: ApiJob[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<Partial<ApiJob> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startEdit = async (j: ApiJob) => {
    const full = await api.job(token, j.id).catch(() => null);
    if (full) setEditing(full);
  };

  const save = async () => {
    if (!editing?.company?.trim() || !editing?.title?.trim()) {
      return setError("Company and title are required.");
    }
    setBusy(true);
    setError("");
    try {
      await api.saveJob(token, editing);
      setEditing(null);
      onChanged();
    } catch {
      setError("Could not save. The description may be too large (100 KB max).");
    }
    setBusy(false);
  };

  const field = (k: keyof ApiJob, placeholder: string) => (
    <input
      value={(editing?.[k] as string) ?? ""}
      onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
      placeholder={placeholder}
      className="w-full rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm focus:outline-none"
    />
  );

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field("company", "Company")}
          {field("title", "Title")}
          {field("location", "Location")}
          {field("url", "Link to the posting")}
        </div>
        <select
          value={editing.status ?? "saved"}
          onChange={(e) => setEditing({ ...editing, status: e.target.value as JobStatus })}
          className="w-full rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm capitalize focus:outline-none"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <textarea
          value={editing.description ?? ""}
          onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          placeholder="Paste the job description. This is the part the coach reasons against."
          className="h-64 w-full resize-none rounded-2xl border border-border bg-background/60 p-4 text-xs leading-relaxed focus:outline-none"
        />
        {error && <p className="text-xs text-coral">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
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
        Roles you are applying to. Pick one in the Coach tab to get advice aimed at that posting.
      </p>
      <ul className="mt-4 space-y-2">
        {jobs.map((j) => (
          <li key={j.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <button onClick={() => startEdit(j)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium">
                {j.company} — {j.title}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {j.location || "Location not set"} · updated {j.updatedAt.slice(0, 10)}
              </div>
            </button>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium capitalize ${STATUS_TONE[j.status]}`}
            >
              {j.status}
            </span>
            <button
              onClick={() => api.deleteJob(token, j.id).then(onChanged)}
              title="Delete"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {jobs.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No roles tracked yet.
          </li>
        )}
      </ul>
      <button
        onClick={() => setEditing({ ...blank })}
        className="mt-4 rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95"
      >
        Add a role
      </button>
    </div>
  );
}
