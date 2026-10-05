import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { ProblemChecklist } from "../components/ProblemChecklist";
import { Button, SearchField, Tally } from "../components/Controls";
import { useData } from "../data/context";
import { useFetch } from "../data/hooks";
import { toCategories } from "../data/transform";
import { api } from "../lib/api";
import { filterCategories, matches, normalize } from "../lib/search";
import type { Category, Friend, ProblemRef } from "../types";

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
  const [query, setQuery] = useState("");
  // Only problems on one of the curated lists.
  const cats = useFetch(
    friend.id,
    () => api.friendProgress(getToken, friend.id).then((rows) => toCategories(rows ?? [], (r) => r.blind75 || r.neetcode150 || r.neetcode250)),
    [] as Category[],
  );

  const all = cats.flatMap((c) => c.items);
  const q = normalize(query);
  const filtered = filterCategories(cats, (p) => matches(q, p.name));

  return (
    <Modal title={friend.name} eyebrow="Friend · Progress" onClose={onClose} onBack={onBack}>
      <Tally value={all.filter((p) => p.done).length}>
        of {all.length} solved · open a solved problem to see how they did it
      </Tally>
      <SearchField className="mt-4" value={query} onChange={setQuery} placeholder="Search problems…" />
      <div className="mt-6 space-y-6">
        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground">No problems yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No problems match "{query}".</p>
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
