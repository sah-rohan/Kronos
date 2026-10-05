import { useState } from "react";
import { Modal } from "../components/Modal";
import { ProblemChecklist } from "../components/ProblemChecklist";
import { Tabs, SearchField } from "../components/Controls";
import { useData } from "../data/source";
import type { ProblemRef, ProblemList } from "../types";

const LISTS: { key: ProblemList; label: string }[] = [
  { key: "blind75", label: "Blind 75" },
  { key: "neetcode150", label: "NeetCode 150" },
  { key: "neetcode250", label: "NeetCode 250" },
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
    <Modal title="Progress" eyebrow="Your problems" onClose={onClose}>
      <Tabs tabs={LISTS} value={list} onChange={setList} />
      <p className="m-0 mt-5 flex items-baseline gap-2">
        <span className="font-display text-[34px] font-light leading-none">{listSolved}</span>
        <span className="text-[15px] text-muted-foreground">of {listAll.length} solved · open a solved problem to see your solution</span>
      </p>
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
