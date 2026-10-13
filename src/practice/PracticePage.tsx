import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useData } from "../data/context";
import { api, type PadLanguage, type PadList, type PadProgress, type PadSummary } from "../lib/api";
import { DIFFS } from "../lib/difficulty";
import { num } from "../lib/format";
import { ROADMAPS, inList } from "../lib/roadmaps";
import { useStoredChoice } from "../lib/storage";
import { DiffLabel, SearchField, SectionHead } from "../components/Controls";
import type { ProblemList } from "../types";
import { MarkLegend, ProgressTable } from "./Marks";
import { LANGUAGES, MARK_LABEL, languageLabel, markTone } from "./rubric";

const RESULTS = 12;
const LIST_KEYS = ["all", ...ROADMAPS.map((r) => r.key)] as const;
const LANG_KEYS = LANGUAGES.map((l) => l.key);

const STATUS: Record<string, string> = { draft: "In progress", grading: "Grading", failed: "Not graded" };

function PadRow({ pad, index, onOpen, onDelete }: { pad: PadSummary; index: number; onOpen: () => void; onDelete: () => void }) {
  const date = new Date(pad.submittedAt ?? pad.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <li className="group grid grid-cols-[minmax(0,1fr)_40px] items-center border-t border-border">
      <button type="button" onClick={onOpen} className="grid min-h-11 grid-cols-[36px_1fr_auto] items-center gap-4 py-3.5 text-left">
        <span className="font-mono text-[13px] text-muted-foreground">{num(index)}</span>
        <span className="min-w-0">
          <span className="block truncate text-base transition-colors group-hover:text-accent">{pad.title}</span>
          <span className="block truncate text-[13px] text-muted-foreground">
            {languageLabel(pad.language)} · {pad.difficulty} · {date}
          </span>
        </span>
        <span className={`text-right text-[13px] font-medium ${pad.overall ? markTone(pad.overall) : "text-muted-foreground"}`}>
          {pad.overall ? MARK_LABEL[pad.overall] : STATUS[pad.status]}
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete pad for ${pad.title}`}
        className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted hover:text-danger focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export function PracticePage({ onOpen }: { onOpen: (id: string) => void }) {
  const { categories, getToken } = useData();
  const [list, setList] = useState<PadList | null>(null);
  const [progress, setProgress] = useState<PadProgress | null>(null);
  const [query, setQuery] = useState("");
  const [roadmap, setRoadmap] = useStoredChoice<(typeof LIST_KEYS)[number]>("kronos:practice:list", LIST_KEYS, "neetcode150");
  const [diff, setDiff] = useState<string>("");
  const [language, setLanguage] = useStoredChoice<PadLanguage>("kronos:practice:language", LANG_KEYS, "python");
  const [starting, setStarting] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    api.pads(getToken).then(setList).catch(() => setList({ available: false, pads: [] }));
    api.padProgress(getToken).then(setProgress).catch(() => {});
  };
  useEffect(load, [getToken]);

  const problems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .flatMap((c) => c.items.map((p) => ({ ...p, category: c.title })))
      .filter((p) => inList(p, roadmap as ProblemList) && (!diff || p.diff === diff) && (!q || p.name.toLowerCase().includes(q)))
      .slice(0, RESULTS);
  }, [categories, query, roadmap, diff]);

  const start = async (slug: string) => {
    setStarting(slug);
    setError("");
    try {
      onOpen((await api.startPad(getToken, slug, language)).id);
    } catch {
      setError("Couldn't start that pad. Try again.");
      setStarting("");
    }
  };

  const remove = async (pad: PadSummary) => {
    if (!window.confirm(`Delete your pad for ${pad.title}? This can't be undone.`)) return;
    await api.deletePad(getToken, pad.id).catch(() => {});
    load();
  };

  const graded = progress?.areas.some((a) => a.points.length > 0);
  const select = "min-h-10 rounded-full border border-border-strong bg-card px-3 text-sm text-foreground";

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-10">
      <header>
        <h1 className="m-0 font-display text-[clamp(40px,5vw,60px)] font-light leading-[1.02] tracking-[-0.02em]">Practice</h1>
      </header>

      {list && !list.available && (
        <p className="m-0 rounded-xl border border-border px-5 py-4 text-sm text-muted-foreground">
          Practice isn't available right now. Your pads are safe; grading is switched off.
        </p>
      )}

      <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-[2] flex-col gap-12">
          <section aria-labelledby="pads">
            <h2 id="pads" className="m-0 mb-2 font-display text-[30px] font-normal">
              Your pads
            </h2>
            {list && list.pads.length === 0 ? (
              <p className="m-0 border-t border-border py-5 text-[15px] text-muted-foreground">
                Pick a problem to start. Write your reasoning in notes and your solution in code, then submit for feedback.
              </p>
            ) : (
              <ul className="m-0 list-none border-b border-border p-0">
                {list?.pads.map((p, i) => <PadRow key={p.id} pad={p} index={i} onOpen={() => onOpen(p.id)} onDelete={() => remove(p)} />)}
              </ul>
            )}
          </section>

          {progress && graded && (
            <section aria-labelledby="trend" className="flex flex-col gap-3">
              <SectionHead title="Your rubric over time" meta={progress.focus ? `focus: ${progress.focus}` : undefined} />
              <MarkLegend />
              <ProgressTable progress={progress} />
            </section>
          )}
        </div>

        <aside aria-labelledby="start" className="flex flex-1 flex-col gap-4 rounded-xl border border-border bg-card p-6 lg:sticky lg:top-6">
          <span id="start" className="eyebrow">
            Start a pad
          </span>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="pad-language">
              Language
            </label>
            <select id="pad-language" value={language} onChange={(e) => setLanguage(e.target.value as PadLanguage)} className={select}>
              {LANGUAGES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="pad-list">
              Problem list
            </label>
            <select id="pad-list" value={roadmap} onChange={(e) => setRoadmap(e.target.value as (typeof LIST_KEYS)[number])} className={select}>
              {ROADMAPS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
              <option value="all">All problems</option>
            </select>
            <label className="sr-only" htmlFor="pad-diff">
              Difficulty
            </label>
            <select id="pad-diff" value={diff} onChange={(e) => setDiff(e.target.value)} className={select}>
              <option value="">Any difficulty</option>
              {DIFFS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <SearchField value={query} onChange={setQuery} placeholder="Search problems…" />
          {error && <p className="m-0 text-sm text-danger">{error}</p>}
          <ul className="m-0 list-none p-0">
            {problems.map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => start(p.slug)}
                  disabled={!!starting || (list !== null && !list.available)}
                  className="flex min-h-11 w-full items-center gap-3 border-t border-border py-2.5 text-left transition-colors hover:text-accent disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{starting === p.slug ? "Opening…" : p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.category}</span>
                  </span>
                  <DiffLabel diff={p.diff} />
                </button>
              </li>
            ))}
            {problems.length === 0 && <li className="border-t border-border py-4 text-sm text-muted-foreground">No problems match.</li>}
          </ul>
        </aside>
      </div>
    </div>
  );
}
