import { useEffect, useState } from "react";
import { Check, ChevronRight, Search, UserPlus, X } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import { api, type ApiFriend } from "../lib/api";
import { initialsOf, colorFor } from "../lib/avatar";
import type { Friend } from "../types";

export function FriendsModal({
  onClose,
  onOpenFriend,
}: {
  onClose: () => void;
  onOpenFriend: (f: Friend) => void;
}) {
  const { friends, addFriend, getToken, refresh } = useData();
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<ApiFriend[]>([]);
  const [requests, setRequests] = useState<ApiFriend[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  const load = () => {
    api.directory(getToken).then(setPeople).catch(() => setPeople([]));
    api.friendRequests(getToken).then(setRequests).catch(() => setRequests([]));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const request = async (username: string) => {
    if (!username || busy) return;
    setBusy(username);
    try {
      await addFriend(username);
      setSent((s) => [...s, username]);
      setQuery("");
    } finally {
      setBusy(null);
    }
  };

  const accept = async (id: string) => {
    setBusy(id);
    try {
      await api.acceptRequest(getToken, id);
      await refresh();
      load();
    } finally {
      setBusy(null);
    }
  };

  const decline = async (id: string) => {
    setBusy(id);
    try {
      await api.declineRequest(getToken, id);
      load();
    } finally {
      setBusy(null);
    }
  };

  const q = query.trim().toLowerCase();
  const suggestions = people.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
  );
  const shownFriends = friends.filter(
    (f) => !q || f.name.toLowerCase().includes(q) || (f.username ?? "").toLowerCase().includes(q)
  );

  const tabBtn = (key: "friends" | "requests", label: string, count?: number) => (
    <button
      onClick={() => { setTab(key); setQuery(""); }}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
        tab === key ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
      {count ? <span className="ml-1.5 tabular-nums">{count}</span> : null}
    </button>
  );

  return (
    <Modal title="My Friends" onClose={onClose}>
      <div className="flex gap-1 rounded-full border border-border bg-background/60 p-1">
        {tabBtn("friends", "Friends", friends.length)}
        {tabBtn("requests", "Requests", requests.length)}
      </div>

      {tab === "friends" ? (
        <>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your friends…"
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <ul className="mt-4 space-y-3">
            {shownFriends.map((f) => (
              <li key={f.id}>
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
                No friends yet.
              </li>
            )}
          </ul>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && q && request(query.trim())}
              placeholder="Search people to add…"
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {requests.length > 0 && (
            <>
              <div className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Incoming requests</div>
              <ul className="mt-2 space-y-2">
                {requests.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-2.5">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-medium ${colorFor(p.username || p.name)}`}>
                      {initialsOf(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
                    </div>
                    <button
                      onClick={() => accept(p.id)}
                      disabled={busy === p.id}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
                      title="Accept"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => decline(p.id)}
                      disabled={busy === p.id}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-60"
                      title="Decline"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">People on Kronos</div>
          <ul className="mt-2 space-y-2">
            {suggestions.map((p) => {
              const requested = sent.includes(p.username);
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-2.5">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-medium ${colorFor(p.username || p.name)}`}>
                    {initialsOf(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">@{p.username} · {p.solved} solved</div>
                  </div>
                  <button
                    onClick={() => request(p.username)}
                    disabled={busy === p.username || requested}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-coral px-3.5 py-1.5 text-xs font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> {requested ? "Requested" : busy === p.username ? "…" : "Request"}
                  </button>
                </li>
              );
            })}
            {suggestions.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No one to add.
              </li>
            )}
          </ul>
        </>
      )}
    </Modal>
  );
}
