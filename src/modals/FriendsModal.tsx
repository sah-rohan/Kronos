import { useState } from "react";
import { ChevronRight, Search, UserPlus } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import type { Friend } from "../types";

export function FriendsModal({
  onClose,
  onOpenFriend,
}: {
  onClose: () => void;
  onOpenFriend: (f: Friend) => void;
}) {
  const { friends, addFriend } = useData();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const submit = async () => {
    const username = input.trim();
    if (!username) return;
    await addFriend(username);
    setInput("");
  };

  const shown = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.username ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal title="My Friends" onClose={onClose}>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add by LeetCode username"
          className="flex-1 rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-coral-foreground transition hover:opacity-95"
        >
          <UserPlus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search friends"
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <ul className="mt-5 space-y-3">
        {shown.map((f) => (
          <li key={f.username ?? f.name}>
            <button
              onClick={() => onOpenFriend(f)}
              className="flex w-full items-center gap-4 rounded-2xl border border-border px-4 py-3 text-left transition hover:bg-muted"
            >
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium ${f.color}`}>
                {f.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{f.name}</div>
                {f.username && <div className="truncate text-xs text-muted-foreground">@{f.username}</div>}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
        {friends.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No friends yet. Add someone by their LeetCode username.
          </li>
        )}
      </ul>
    </Modal>
  );
}
