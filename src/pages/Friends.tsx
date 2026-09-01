/**
 * `/friends` — manage friends.
 *
 * Migrated from `modals/FriendsModal.tsx`. `tab` and `query` are now `?tab=`
 * and `?q=`, so `/friends?tab=requests` is a linkable address (useful when
 * someone is told "you have a pending request"). Opening a friend is a
 * navigation to `/u/:handle` rather than a callback that swapped one modal for
 * another.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, Search, UserPlus, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../data/context";
import { api, type ApiFriend } from "../lib/api";
import { initialsOf, colorFor } from "../lib/avatar";
import { paths } from "../lib/slugs";

const TABS = ["friends", "requests"] as const;
type Tab = (typeof TABS)[number];
const DEFAULT_TAB: Tab = "friends";

export function Friends() {
  const { friends, addFriend, getToken, refresh } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [people, setPeople] = useState<ApiFriend[]>([]);
  const [requests, setRequests] = useState<ApiFriend[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  const rawTab = searchParams.get("tab");
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : DEFAULT_TAB;
  const query = searchParams.get("q") ?? "";

  // One writer for both params so switching tab can also clear the search
  // without a second history entry.
  const setParams = useCallback(
    (next: { tab?: Tab; q?: string }) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next.tab !== undefined) {
            if (next.tab === DEFAULT_TAB) params.delete("tab");
            else params.set("tab", next.tab);
          }
          if (next.q !== undefined) {
            if (next.q === "") params.delete("q");
            else params.set("q", next.q);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const load = useCallback(() => {
    api
      .directory(getToken)
      .then(setPeople)
      .catch(() => setPeople([]));
    api
      .friendRequests(getToken)
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [getToken]);

  useEffect(load, [load]);

  const q = query.trim().toLowerCase();

  const request = async (username: string) => {
    if (!username || busy) return;
    setBusy(username);
    try {
      await addFriend(username);
      setSent((s) => [...s, username]);
      setParams({ q: "" });
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

  const suggestions = people.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q),
  );
  const shownFriends = friends.filter(
    (f) =>
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.username ?? "").toLowerCase().includes(q),
  );

  const tabBtn = (key: Tab, label: string, count?: number) => (
    <button
      onClick={() => setParams({ tab: key, q: "" })}
      aria-current={tab === key ? "page" : undefined}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
        tab === key ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
      {count ? <span className="ml-1.5 tabular-nums">{count}</span> : null}
    </button>
  );

  return (
    <>
      <PageHeader title="My Friends" backTo={paths.dashboard()} backLabel="Dashboard" />

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
              onChange={(e) => setParams({ q: e.target.value })}
              placeholder="Search your friends…"
              aria-label="Search your friends"
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <ul className="mt-4 space-y-3">
            {shownFriends.map((f) => (
              <li key={f.id}>
                <Link
                  to={paths.user(f.username || f.name)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-border px-4 py-3 text-left transition hover:bg-muted"
                >
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-medium ${f.color}`}
                  >
                    {f.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    {f.username && (
                      <div className="truncate text-xs text-muted-foreground">@{f.username}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
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
              onChange={(e) => setParams({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && q && request(query.trim())}
              placeholder="Search people to add…"
              aria-label="Search people to add"
              className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {requests.length > 0 && (
            <>
              <div className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Incoming requests
              </div>
              <ul className="mt-2 space-y-2">
                {requests.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl border border-border px-4 py-2.5"
                  >
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-medium ${colorFor(p.name)}`}
                    >
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
                      aria-label={`Accept ${p.name}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => decline(p.id)}
                      disabled={busy === p.id}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-60"
                      title="Decline"
                      aria-label={`Decline ${p.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            People on Kronos
          </div>
          <ul className="mt-2 space-y-2">
            {suggestions.map((p) => {
              const requested = sent.includes(p.username);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border border-border px-4 py-2.5"
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-medium ${colorFor(p.name)}`}
                  >
                    {initialsOf(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      @{p.username} · {p.solved} solved
                    </div>
                  </div>
                  <button
                    onClick={() => request(p.username)}
                    disabled={busy === p.username || requested}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-coral px-3.5 py-1.5 text-xs font-medium text-coral-foreground transition hover:opacity-95 disabled:opacity-60"
                  >
                    <UserPlus className="h-3.5 w-3.5" />{" "}
                    {requested ? "Requested" : busy === p.username ? "…" : "Request"}
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
    </>
  );
}
