import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Modal } from "../components/Modal";
import { OptimalTag } from "../components/OptimalTag";
import { diffStyles, leetcodeUrl } from "../data/problems";
import { useData } from "../data/source";
import type { ProblemRef, ProblemList } from "../types";

const LISTS: { key: ProblemList; label: string }[] = [
  { key: "blind75", label: "Blind 75" },
  { key: "neetcode150", label: "NeetCode 150" },
  { key: "neetcode250", label: "NeetCode 250" },
  { key: "all", label: "All" },
];

export function ProgressModal({
  onClose,
  onOpenProblem,
}: {
  onClose: () => void;
  onOpenProblem: (p: ProblemRef) => void;
}) {
  const { categories } = useData();
  const [list, setList] = useState<ProblemList>("neetcode150");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const inList = (p: { blind75: boolean; neetcode150: boolean; neetcode250: boolean }) =>
    list === "all" ? true : list === "blind75" ? p.blind75 : list === "neetcode250" ? p.neetcode250 : p.neetcode150;

  const listCats = categories
    .map((c) => ({ ...c, items: c.items.filter(inList) }))
    .filter((c) => c.items.length > 0);
  const listAll = listCats.flatMap((c) => c.items);
  const listSolved = listAll.filter((p) => p.done).length;

  const filtered = listCats
    .map((c) => ({ ...c, items: q ? c.items.filter((p) => p.name.toLowerCase().includes(q)) : c.items }))
    .filter((c) => c.items.length > 0);

  return (
    <Modal title="My Progress" onClose={onClose}>
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-background/60 p-1">
        {LISTS.map((l) => (
          <button
            key={l.key}
            onClick={() => setList(l.key)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              list === l.key ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        <b className="text-foreground">{listSolved} of {listAll.length}</b> solved. Tap a solved problem to see your solution.
      </p>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems…"
          className="w-full rounded-xl border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-coral"
        />
      </div>
      <div className="mt-6 space-y-6">
        {listAll.length === 0 ? (
          <p className="text-sm text-muted-foreground">This list isn't set up yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No problems match “{query}”.</p>
        ) : null}
        {filtered.map((c) => {
          const done = c.items.filter((p) => p.done).length;
          return (
            <div key={c.title}>
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {done} / {c.items.length}
                </div>
              </div>
              <ul className="mt-2 space-y-1">
                {c.items.map((p) => (
                  <li
                    key={p.name}
                    className="flex flex-col gap-2 rounded-xl px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                          p.done ? "bg-coral text-white" : "border border-border text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-sm ${p.done ? "text-muted-foreground" : "text-foreground"}`}>
                        {p.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                      <a
                        href={leetcodeUrl(p.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
                        title="Open on LeetCode"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {p.done && (
                        <button
                          onClick={() => onOpenProblem({ name: p.name, slug: p.slug, diff: p.diff })}
                          className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                        >
                          Solutions
                        </button>
                      )}
                      {p.done && p.optimal && <OptimalTag />}
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${diffStyles[p.diff]}`}>
                        {p.diff}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
