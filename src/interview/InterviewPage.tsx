import { useEffect, useMemo, useState } from "react";
import { useData } from "../data/context";
import { api, type CodeLanguage, type CodingProgress, type InterviewKind, type InterviewList } from "../lib/api";
import { DIFFS } from "../lib/difficulty";
import { useStoredChoice } from "../lib/storage";
import { DiffLabel, SearchField, SectionHead } from "../components/Controls";
import { MarkLegend, ProgressTable } from "./Marks";
import { KINDS, LANGUAGES, kindName, verdictLabel, verdictTone } from "./labels";

const RESULTS = 8;
const KIND_KEYS = KINDS.map((k) => k.key);
const LANG_KEYS = LANGUAGES.map((l) => l.key);
const STATUS: Record<string, string> = { active: "In progress", grading: "Grading", failed: "Not graded" };

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      <div role="group" aria-label={label} className="flex overflow-hidden rounded-lg border border-border-strong">
        {options.map((o, i) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={o.key === value}
            onClick={() => onChange(o.key)}
            className={`min-h-10 px-4 text-[13px] ${i > 0 ? "border-l border-border-strong" : ""} ${
              o.key === value ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InterviewPage({ onOpen }: { onOpen: (id: string) => void }) {
  const { categories, getToken } = useData();
  const [list, setList] = useState<InterviewList | null>(null);
  const [progress, setProgress] = useState<CodingProgress | null>(null);
  const [kind, setKind] = useStoredChoice<InterviewKind>("kronos:interview:kind", KIND_KEYS, "coding");
  const [language, setLanguage] = useStoredChoice<CodeLanguage>("kronos:interview:language", LANG_KEYS, "python");
  const [bar, setBar] = useStoredChoice("kronos:interview:bar", ["top", "standard"] as const, "top");
  const [difficulty, setDifficulty] = useState("Medium");
  const [target, setTarget] = useState("");
  const [choose, setChoose] = useState(false);
  const [query, setQuery] = useState("");
  const [slug, setSlug] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.interviews(getToken).then(setList).catch(() => setList({ available: false, interviews: [] }));
    api.interviewProgress(getToken).then(setProgress).catch(() => {});
  }, [getToken]);

  const problems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .flatMap((c) => c.items.map((p) => ({ ...p, category: c.title })))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, RESULTS);
  }, [categories, query]);
  const picked = categories.flatMap((c) => c.items).find((p) => p.slug === slug);

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const iv = await api.startInterview(getToken, {
        kind,
        bar,
        difficulty: kind === "coding" && choose && picked ? picked.diff : difficulty,
        target: target.trim(),
        ...(kind === "coding" ? { language, slug: choose ? slug : undefined } : {}),
      });
      onOpen(iv.id);
    } catch (e) {
      const msg = String(e);
      setError(
        msg.includes("429")
          ? "You've started 6 interviews today. Come back tomorrow."
          : msg.includes("resume")
            ? "Add a resume first: this interview opens from it."
            : msg.includes("503")
              ? "Interviews aren't available right now."
              : "Couldn't start the interview. Try again.",
      );
      setStarting(false);
    }
  };

  const meta = KINDS.find((k) => k.key === kind)!;
  const canStart = !starting && !(kind === "coding" && choose && !slug) && list?.available !== false;
  const graded = progress?.areas.some((a) => a.points.length > 0);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-10">
      <header>
        <h1 className="m-0 font-display text-[clamp(40px,5vw,60px)] font-light leading-[1.02] tracking-[-0.02em]">Interview</h1>
      </header>

      {list && !list.available && (
        <p className="m-0 rounded-xl border border-border px-5 py-4 text-sm text-muted-foreground">Interviews aren't available right now.</p>
      )}

      <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
        <section aria-labelledby="start" className="flex min-w-0 flex-[1.4] flex-col gap-7">
          <h2 id="start" className="sr-only">
            Start an interview
          </h2>
          <div role="radiogroup" aria-label="Kind" className="flex flex-col border-b border-border">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                role="radio"
                aria-checked={k.key === kind}
                onClick={() => setKind(k.key)}
                className="flex items-start gap-4 border-t border-border px-1 py-4 text-left"
              >
                <span
                  className={`mt-1 h-4 w-4 shrink-0 rounded-full ${k.key === kind ? "border-[5px] border-accent" : "border-[1.5px] border-border-strong"}`}
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[17px] font-medium">{k.name}</span>
                  <span className="leading-relaxed text-muted-foreground">{k.blurb}</span>
                </span>
                <span className="ml-auto shrink-0 pt-1 font-mono text-xs text-muted-foreground">{k.minutes} min</span>
              </button>
            ))}
          </div>

          {kind === "coding" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">Language</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as CodeLanguage)}
                    className="min-h-10 rounded-lg border border-border-strong bg-card px-3 text-[13px]"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.key} value={l.key}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Segmented
                  label="Problem"
                  options={[
                    { key: "pick", label: "Pick for me" },
                    { key: "choose", label: "Choose one" },
                  ]}
                  value={choose ? "choose" : "pick"}
                  onChange={(v) => setChoose(v === "choose")}
                />
                {!choose && (
                  <Segmented label="Difficulty" options={DIFFS.map((d) => ({ key: d, label: d }))} value={difficulty} onChange={setDifficulty} />
                )}
              </div>
              {choose ? (
                <div className="flex flex-col gap-2">
                  <SearchField value={query} onChange={setQuery} placeholder="Search problems…" />
                  <ul className="m-0 list-none p-0">
                    {problems.map((p) => (
                      <li key={p.slug}>
                        <button
                          type="button"
                          aria-pressed={p.slug === slug}
                          onClick={() => setSlug(p.slug)}
                          className={`flex min-h-11 w-full items-center gap-3 border-t border-border px-2 py-2 text-left transition-colors ${
                            p.slug === slug ? "bg-muted" : "hover:text-accent"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px]">{p.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{p.category}</span>
                          </span>
                          <DiffLabel diff={p.diff} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="m-0 text-[13px] text-muted-foreground">A problem you haven't solved, from your weakest NeetCode categories.</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <Segmented
              label="Graded against"
              options={[
                { key: "top", label: "Top-tier bar" },
                { key: "standard", label: "Standard bar" },
              ]}
              value={bar}
              onChange={setBar}
            />
            <label className="flex min-w-[220px] flex-1 flex-col gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">
                Interviewing for <span className="font-normal">(optional)</span>
              </span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                maxLength={200}
                placeholder="e.g. Stripe, new grad SWE"
                className="min-h-10 rounded-lg border border-border-strong bg-card px-3 text-sm outline-none focus:border-foreground"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={start}
              disabled={!canStart}
              className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-ink-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {starting ? "The interviewer is getting ready…" : `Begin ${meta.name.toLowerCase()} interview`}
            </button>
            {kind === "coding" && choose && picked && <span className="text-[13px] text-muted-foreground">{picked.name}</span>}
          </div>
          {error && <p className="-mt-3 m-0 text-sm text-danger">{error}</p>}
        </section>

        <aside className="flex flex-1 flex-col gap-10">
          <section aria-labelledby="past" className="flex flex-col">
            <SectionHead title="Past interviews" />
            {list && list.interviews.length === 0 ? (
              <p className="m-0 py-4 text-sm text-muted-foreground">Your interviews and debriefs will show up here.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {list?.interviews.map((iv) => (
                  <li key={iv.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(iv.id)}
                      className="group flex min-h-11 w-full items-center gap-3 border-b border-border py-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] transition-colors group-hover:text-accent">{iv.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {kindName(iv.kind)} · {new Date(iv.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </span>
                      <span className={`shrink-0 text-[13px] font-medium ${iv.verdict ? verdictTone(iv.verdict) : "text-muted-foreground"}`}>
                        {iv.verdict ? verdictLabel(iv.verdict) : STATUS[iv.status]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {progress && graded && (
            <section aria-labelledby="coding-progress" className="flex flex-col gap-3">
              <SectionHead title="Coding over time" meta={progress.focus ? `focus: ${progress.focus}` : undefined} />
              <MarkLegend />
              <ProgressTable progress={progress} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
