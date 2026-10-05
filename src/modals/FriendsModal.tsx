import { useEffect, useState } from "react";
import { Check, ChevronRight, UserPlus, X } from "lucide-react";
import { Modal } from "../components/Modal";
import { Button, PersonRow, SearchField, Tabs } from "../components/Controls";
import { useData } from "../data/source";
import { api, type ApiFriend } from "../lib/api";
import { initialsOf } from "../lib/avatar";
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
    api
      .directory(getToken)
      .then(setPeople)
      .catch(() => setPeople([]));
    api
      .friendRequests(getToken)
      .then(setRequests)
      .catch(() => setRequests([]));
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
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q),
  );
  const shownFriends = friends.filter(
    (f) =>
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.username ?? "").toLowerCase().includes(q),
  );


  return (
    <Modal title="Friends" eyebrow={`${friends.length} added`} onClose={onClose}>
      <Tabs
        tabs={[
          { key: "friends" as const, label: <>Friends <span className="font-mono text-xs text-muted-foreground">{friends.length}</span></> },
          { key: "requests" as const, label: <>Requests <span className="font-mono text-xs text-muted-foreground">{requests.length}</span></> },
        ]}
        value={tab}
        onChange={(k) => {
          setTab(k);
          setQuery("");
        }}
      />

      {tab === "friends" ? (
        <>
          <SearchField className="mt-4" value={query} onChange={setQuery} placeholder="Search your friends…" />
          <ul className="m-0 mt-5 list-none border-b border-border p-0">
            {shownFriends.map((f) => (
              <PersonRow
                key={f.id}
                initials={f.initials}
                name={f.name}
                sub={f.username ? `@${f.username}` : undefined}
                onClick={() => onOpenFriend(f)}
                trailing={<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              />
            ))}
            {friends.length === 0 && (
              <li className="border-t border-border py-6 text-sm text-muted-foreground">No friends yet. Add people from the Requests tab.</li>
            )}
          </ul>
        </>
      ) : (
        <>
          <div className="mt-5" onKeyDown={(e) => e.key === "Enter" && q && request(query.trim())}>
            <SearchField value={query} onChange={setQuery} placeholder="Search people to add…" />
          </div>

          {requests.length > 0 && (
            <>
              <div className="eyebrow mt-7 pb-1">Incoming requests</div>
              <ul className="m-0 list-none border-b border-border p-0">
                {requests.map((p) => (
                  <PersonRow
                    key={p.id}
                    initials={initialsOf(p.name)}
                    name={p.name}
                    sub={`@${p.username}`}
                    trailing={
                      <span className="flex gap-2">
                        <Button onClick={() => accept(p.id)} disabled={busy === p.id}>
                          <Check className="h-4 w-4" /> Accept
                        </Button>
                        <Button variant="secondary" onClick={() => decline(p.id)} disabled={busy === p.id}>
                          <X className="h-4 w-4" /> Decline
                        </Button>
                      </span>
                    }
                  />
                ))}
              </ul>
            </>
          )}

          <div className="eyebrow mt-7 pb-1">People on Kronos</div>
          <ul className="m-0 list-none border-b border-border p-0">
            {suggestions.map((p) => {
              const requested = sent.includes(p.username);
              return (
                <PersonRow
                  key={p.id}
                  initials={initialsOf(p.name)}
                  name={p.name}
                  sub={
                    <>
                      @{p.username} · <span className="font-mono">{p.solved}</span> solved
                    </>
                  }
                  trailing={
                    <Button
                      variant={requested ? "secondary" : "primary"}
                      onClick={() => request(p.username)}
                      disabled={busy === p.username || requested}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {requested ? "Requested" : busy === p.username ? "…" : "Request"}
                    </Button>
                  }
                />
              );
            })}
            {suggestions.length === 0 && <li className="border-t border-border py-6 text-sm text-muted-foreground">No one to add.</li>}
          </ul>
        </>
      )}
    </Modal>
  );
}
