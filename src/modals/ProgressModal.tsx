import { useState } from "react";
import { Modal } from "../components/Modal";
import { ProblemChecklist } from "../components/ProblemChecklist";
import { SearchField, Tabs, Tally } from "../components/Controls";
import { useData } from "../data/context";
import { ROADMAPS, inList } from "../lib/roadmaps";
import { filterCategories, matches, normalize } from "../lib/search";
import type { ProblemList, ProblemRef } from "../types";

export function ProgressModal({ onClose, onOpenProblem }: { onClose: () => void; onOpenProblem: (p: ProblemRef) => void }) {
  const { categories } = useData();
  const [list, setList] = useState<ProblemList>("neetcode150");
  const [query, setQuery] = useState("");
  const q = normalize(query);

  const listCats = filterCategories(categories, (p) => inList(p, list));
  const listAll = listCats.flatMap((c) => c.items);
  const filtered = filterCategories(listCats, (p) => matches(q, p.name));

  return (
    <Modal title="Progress" eyebrow="Your problems" onClose={onClose}>
      <Tabs tabs={ROADMAPS} value={list} onChange={setList} />
      <Tally value={listAll.filter((p) => p.done).length} className="mt-5">
        of {listAll.length} solved · open a solved problem to see your solution
      </Tally>
      <SearchField className="mt-4" value={query} onChange={setQuery} placeholder="Search problems…" />
      <div className="mt-6 space-y-8">
        {listAll.length === 0 ? (
          <p className="text-sm text-muted-foreground">This list isn't set up yet.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No problems match “{query}”.</p>
        ) : null}
        <ProblemChecklist categories={filtered} onOpen={onOpenProblem} />
      </div>
    </Modal>
  );
}
