import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { OptimalTag } from "../components/OptimalTag";
import { categories as mockCategories, TOTAL, diffStyles } from "../data/problems";
import { friendSolved, friendOptimal } from "../data/friends";
import { useData } from "../data/source";
import { useApi } from "../lib/env";
import { api } from "../lib/api";
import type { Friend, ProblemRef } from "../types";

type Item = { name: string; slug: string; diff: string; done: boolean; optimal: boolean };
type Cat = { title: string; items: Item[] };

export function FriendProgressModal({
  friend,
  onClose,
  onBack,
  onOpenProblem,
  onRemove,
}: {
  friend: Friend;
  onClose: () => void;
  onBack?: () => void;
  onOpenProblem: (p: ProblemRef) => void;
  onRemove: () => void;
}) {
  const { getToken } = useData();
  const [confirming, setConfirming] = useState(false);

  const mockCats: Cat[] = mockCategories.map((c) => ({
    title: c.title,
    items: c.items.map((p) => ({
      name: p.name,
      slug: p.slug,
      diff: p.diff,
      done: friendSolved(friend, p.name),
      optimal: friendOptimal(friend, p.name),
    })),
  }));

  const [cats, setCats] = useState<Cat[]>(useApi ? [] : mockCats);

  useEffect(() => {
    if (!useApi) return;
    api
      .friendProgress(getToken, friend.id)
      .then((rows) => {
        const order: string[] = [];
        const map = new Map<string, Item[]>();
        for (const r of rows ?? []) {
          if (!map.has(r.category)) {
            map.set(r.category, []);
            order.push(r.category);
          }
          map.get(r.category)!.push({ name: r.title, slug: r.slug, diff: r.difficulty, done: r.done, optimal: r.optimal });
        }
        setCats(order.map((title) => ({ title, items: map.get(title)! })));
      })
      .catch(() => setCats([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = cats.flatMap((c) => c.items);
  const solvedCount = all.filter((p) => p.done).length;
  const total = useApi ? all.length : TOTAL;

  return (
    <Modal title={`${friend.name}'s progress`} onClose={onClose} onBack={onBack}>
      <p className="text-sm text-muted-foreground">
        <b className="text-foreground">{solvedCount} of {total}</b> solved. Tap a solved problem to see how they solved it.
      </p>
      <div className="mt-6 space-y-6">
        {cats.map((c) => {
          const solved = c.items.filter((p) => p.done).length;
          return (
            <div key={c.title}>
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground tabular-nums">{solved} / {c.items.length}</div>
              </div>
              <ul className="mt-2 space-y-1">
                {c.items.map((p) => (
                  <li
                    key={p.slug || p.name}
                    onClick={() => p.done && onOpenProblem({ name: p.name, slug: p.slug, diff: p.diff })}
                    className={`flex flex-col gap-2 rounded-xl px-3 py-2 sm:flex-row sm:items-center sm:gap-3 ${p.done ? "cursor-pointer transition hover:bg-muted" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${p.done ? "bg-coral text-white" : "border border-border text-transparent"}`}>
                        ✓
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-sm ${p.done ? "text-foreground" : "text-muted-foreground"}`}>
                        {p.name}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                      {p.done && <span className="shrink-0 text-[11px] text-muted-foreground">view ›</span>}
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
      {confirming ? (
        <div className="mt-8 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Remove {friend.name}?</span>
          <button
            onClick={onRemove}
            className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 text-sm font-medium text-coral-foreground transition hover:opacity-95"
          >
            <Trash2 className="h-4 w-4" /> Confirm
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-coral transition hover:bg-muted"
        >
          <Trash2 className="h-4 w-4" /> Remove {friend.name}
        </button>
      )}
    </Modal>
  );
}
