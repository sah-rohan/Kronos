import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { ProblemChecklist } from "../components/ProblemChecklist";
import { Button, SearchField } from "../components/Controls";
import { useData } from "../data/source";
import { api } from "../lib/api";
import type { Friend, ProblemRef } from "../types";

type Item = {
  name: string;
  slug: string;
  diff: string;
  done: boolean;
  optimal: boolean;
  blind75: boolean;
  neetcode150: boolean;
  neetcode250: boolean;
};
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
  const [cats, setCats] = useState<Cat[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .friendProgress(getToken, friend.id)
      .then((rows) => {
        const order: string[] = [];
        const map = new Map<string, Item[]>();
        for (const r of rows ?? []) {
          // Only include problems that are in one of the curated lists
          if (!r.blind75 && !r.neetcode150 && !r.neetcode250) continue;

          if (!map.has(r.category)) {
            map.set(r.category, []);
            order.push(r.category);
          }
          map.get(r.category)!.push({
            name: r.title,
            slug: r.slug,
            diff: r.difficulty,
            done: r.done,
            optimal: r.optimal,
            blind75: r.blind75,
            neetcode150: r.neetcode150,
            neetcode250: r.neetcode250,
          });
        }
        setCats(order.map((title) => ({ title, items: map.get(title)! })));
      })
      .catch(() => setCats([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = cats.flatMap((c) => c.items);
  const solvedCount = all.filter((p) => p.done).length;
  const total = all.length;
  const q = query.trim().toLowerCase();

  const filtered = cats
    .map((c) => ({
      ...c,
      items: q
        ? c.items.filter((p) => p.name.toLowerCase().includes(q))
        : c.items,
    }))
    .filter((c) => c.items.length > 0);

  return (
    <Modal
      title={friend.name}
      eyebrow="Friend · Progress"
      onClose={onClose}
      onBack={onBack}
    >
      <p className="m-0 flex items-baseline gap-2">
        <span className="font-display text-[34px] font-light leading-none">{solvedCount}</span>
        <span className="text-[15px] text-muted-foreground">of {total} solved · open a solved problem to see how they did it</span>
      </p>
      <SearchField className="mt-4" value={query} onChange={setQuery} placeholder="Search problems…" />
      <div className="mt-6 space-y-6">
        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground">No problems yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No problems match "{query}".
          </p>
        ) : null}
        <ProblemChecklist categories={filtered} onOpen={onOpenProblem} />
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {confirming ? (
          <>
            <span className="text-sm text-muted-foreground">Remove {friend.name} from your friends?</span>
            <Button variant="danger" onClick={onRemove}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            <Trash2 className="h-4 w-4" /> Remove {friend.name}
          </Button>
        )}
      </div>
    </Modal>
  );
}
