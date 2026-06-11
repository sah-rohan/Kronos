import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Modal } from "../components/Modal";
import { AvatarStack } from "../components/AvatarStack";
import { useData } from "../data/source";
import { diffStyles } from "../data/problems";
import { fmtShortDate } from "../lib/date";
import type { Friend, ProblemRef } from "../types";

type Tab = "you" | "friends";

function FriendPicker({
  friends,
  selected,
  onSelect,
}: {
  friends: Friend[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const current = friends.find((f) => f.name === selected);
  const filtered = friends.filter(
    (f) => !q || f.name.toLowerCase().includes(q) || (f.username ?? "").toLowerCase().includes(q),
  );

  return (
    <div className="relative mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-left text-sm outline-none transition hover:border-coral"
      >
        {current && (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-medium ${current.color}`}>
            {current.initials}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{current?.name ?? "Select a friend"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onMouseDown={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute z-[70] mt-1.5 w-full rounded-xl border border-border bg-background p-1.5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="relative mb-1.5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search friends…"
                className="w-full rounded-lg border border-border bg-transparent py-1.5 pl-8 pr-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-coral"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onSelect(f.name);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-muted ${
                    f.name === selected ? "bg-muted" : ""
                  }`}
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-medium ${f.color}`}>
                    {f.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                  {f.username && <span className="shrink-0 truncate text-xs text-muted-foreground">@{f.username}</span>}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">No friends match “{query}”.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function RecentActivityModal({
  onClose,
  userName,
  onOpenProblem,
  onOpenFriendProblem,
}: {
  onClose: () => void;
  userName: string;
  onOpenProblem: (p: ProblemRef) => void;
  onOpenFriendProblem: (friend: Friend, p: ProblemRef) => void;
}) {
  const { recent, friends } = useData();
  const [tab, setTab] = useState<Tab>("you");
  const [friendName, setFriendName] = useState<string>(friends[0]?.name ?? "");
  const selectedFriend = friends.find((f) => f.name === friendName) ?? null;

  const rows =
    tab === "you"
      ? recent.filter((r) => r.who.some((p) => p.name === userName))
      : friendName
        ? recent.filter((r) => r.who.some((p) => p.name === friendName))
        : [];

  return (
    <Modal title="Recent Activity" onClose={onClose}>
      <div className="mb-4 flex gap-1 rounded-full border border-border bg-background/60 p-1">
        {([
          { key: "you", label: "You" },
          { key: "friends", label: "Friends" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "friends" && friends.length > 0 && (
        <FriendPicker friends={friends} selected={friendName} onSelect={setFriendName} />
      )}

      <p className="text-sm text-muted-foreground">
        {tab === "you"
          ? "Your latest solves. Tap a row to see your solution."
          : friendName
            ? `${friendName}'s latest solves.`
            : "Pick a friend to see their activity."}
      </p>

      <ul className="mt-4 divide-y divide-border">
        {rows.length === 0 && (
          <li className="py-6 text-sm text-muted-foreground">
            {tab === "you"
              ? "No solves yet this season."
              : friends.length === 0
                ? "Add friends to see their activity here."
                : `No recent solves from ${friendName} yet.`}
          </li>
        )}
        {rows.map((r) => {
          // Who to surface as avatars: the selected friend, or (on You) others.
          const who =
            tab === "you"
              ? r.who.filter((p) => p.name !== userName)
              : r.who.filter((p) => p.name === friendName);
          return (
            <li key={r.n} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">#{r.n}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{r.name}</div>
                  {r.at && <div className="text-xs text-muted-foreground">{fmtShortDate(r.at)}</div>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}>
                  {r.diff}
                </span>
                {who.length > 0 && <AvatarStack who={who} cap={3} />}
                <button
                  onClick={() => {
                    const ref = { name: r.name, slug: r.slug, diff: r.diff };
                    if (tab === "friends" && selectedFriend) onOpenFriendProblem(selectedFriend, ref);
                    else onOpenProblem(ref);
                  }}
                  className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition hover:bg-muted"
                >
                  Solutions
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
