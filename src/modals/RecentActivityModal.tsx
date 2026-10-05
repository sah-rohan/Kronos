import { useState } from "react";
import { Modal } from "../components/Modal";
import { ArrowLink, DiffLabel, Tabs } from "../components/Controls";
import { AvatarStack } from "../components/AvatarStack";
import { PersonPicker } from "../components/PersonPicker";
import { useData } from "../data/context";
import { num } from "../lib/format";
import { fmtShortDate } from "../lib/date";
import type { Friend, ProblemRef } from "../types";

type Tab = "you" | "friends";

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
  const [friendId, setFriendId] = useState<string>(friends[0]?.id ?? "");
  const selectedFriend = friends.find((f) => f.id === friendId) ?? null;

  // Whose solves to list: yours, or the picked friend's.
  const subject = tab === "you" ? userName : selectedFriend?.name;
  const rows = subject ? recent.filter((r) => r.who.some((p) => p.name === subject)) : [];

  return (
    <Modal title="Recent" eyebrow="Latest solves" onClose={onClose}>
      <Tabs
        tabs={[
          { key: "you" as const, label: "You" },
          { key: "friends" as const, label: "Friends" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "friends" && friends.length > 0 && (
        <PersonPicker
          className="mt-5"
          value={friendId}
          onSelect={setFriendId}
          options={friends}
        />
      )}

      <ul className="m-0 mt-5 list-none p-0">
        {rows.length === 0 && (
          <li className="border-t border-border py-6 text-sm text-muted-foreground">
            {tab === "you"
              ? "No solves yet this season."
              : friends.length === 0
                ? "Add friends to see their activity here."
                : `No recent solves from ${selectedFriend?.name ?? "them"} yet.`}
          </li>
        )}
        {rows.map((r, i) => {
          const others = r.who.filter((p) => p.name !== subject);
          const ref = { name: r.name, slug: r.slug, diff: r.diff };
          return (
            <li key={r.n} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border py-3.5">
              <span className="w-8 font-mono text-xs text-muted-foreground">{num(i)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{r.name}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {fmtShortDate(r.at)}
                  {others.length > 0 && ` · also ${others.map((p) => p.name.split(" ")[0]).join(", ")}`}
                </span>
              </span>
              <span className="flex items-center gap-4">
                {others.length > 0 && <AvatarStack who={others} cap={3} />}
                <DiffLabel diff={r.diff} />
                <ArrowLink
                  onClick={() =>
                    tab === "friends" && selectedFriend ? onOpenFriendProblem(selectedFriend, ref) : onOpenProblem(ref)
                  }
                >
                  Solution
                </ArrowLink>
              </span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
