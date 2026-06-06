import { ExternalLink } from "lucide-react";
import { Modal } from "../components/Modal";
import { OptimalTag } from "../components/OptimalTag";
import { diffStyles, neetcodeUrl } from "../data/problems";
import { useData } from "../data/source";
import type { ProblemRef } from "../types";

export function ProgressModal({
  onClose,
  onOpenProblem,
}: {
  onClose: () => void;
  onOpenProblem: (p: ProblemRef) => void;
}) {
  const { categories, solved, total } = useData();
  return (
    <Modal title="My Progress" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        <b className="text-foreground">{solved} of {total}</b> solved across the
        NeetCode 150 roadmap. Tap a solved problem to see your best solutions.
      </p>
      <div className="mt-6 space-y-6">
        {categories.map((c) => {
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
                  <li key={p.name} className="flex items-center gap-3 rounded-xl px-3 py-1.5">
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                        p.done ? "bg-coral text-white" : "border border-border text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        p.done ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {p.name}
                    </span>
                    <a
                      href={neetcodeUrl(p.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
                      title="Open on NeetCode"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <div className="flex w-24 justify-end">
                      {p.done && (
                        <button
                          onClick={() => onOpenProblem({ name: p.name, slug: p.slug, diff: p.diff })}
                          className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                        >
                          Solutions
                        </button>
                      )}
                    </div>
                    <div className="flex w-20 justify-end">{p.done && p.optimal && <OptimalTag />}</div>
                    <div className="flex w-16 justify-end">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${diffStyles[p.diff]}`}>
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
