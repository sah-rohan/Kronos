import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { OptimalTag } from "../components/OptimalTag";
import { categories, TOTAL, diffStyles } from "../data/problems";
import { friendSolved, friendSolvedCount, friendOptimal } from "../data/friends";
import type { Friend, ProblemRef } from "../types";

export function FriendProgressModal({
  friend,
  onClose,
  onOpenProblem,
  onRemove,
}: {
  friend: Friend;
  onClose: () => void;
  onOpenProblem: (p: ProblemRef) => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Modal title={`${friend.name}'s progress`} onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        <b className="text-foreground">{friendSolvedCount(friend)} of {TOTAL}</b> solved. Tap a problem to see how they solved it.
      </p>
      <div className="mt-6 space-y-6">
        {categories.map((c) => {
          const solved = c.items.filter((p) => friendSolved(friend, p.name)).length;
          return (
            <div key={c.title}>
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground tabular-nums">{solved} / {c.items.length}</div>
              </div>
              <ul className="mt-2 space-y-1">
                {c.items.map((p) => {
                  const done = friendSolved(friend, p.name);
                  return (
                    <li
                      key={p.name}
                      onClick={() => done && onOpenProblem({ name: p.name, slug: p.slug, diff: p.diff })}
                      className={`flex items-center gap-3 rounded-xl px-3 py-1.5 ${done ? "cursor-pointer transition hover:bg-muted" : ""}`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${done ? "bg-coral text-white" : "border border-border text-transparent"}`}>
                        ✓
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
                        {p.name}
                      </span>
                      {done && <span className="shrink-0 text-[11px] text-muted-foreground">view ›</span>}
                      <div className="flex w-20 justify-end">
                        {done && friendOptimal(friend, p.name) && <OptimalTag />}
                      </div>
                      <div className="flex w-16 justify-end">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${diffStyles[p.diff]}`}>
                          {p.diff}
                        </span>
                      </div>
                    </li>
                  );
                })}
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
