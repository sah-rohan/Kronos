import { Card } from "../components/Card";
import { Avatar } from "../components/Controls";
import { useData } from "../data/context";
import { fmtShortDate } from "../lib/date";
import { DIFF_BAR } from "../lib/difficulty";
import type { RecentItem } from "../types";

export function MyFriendsCard({ onOpen }: { onOpen: () => void }) {
  const { friends, members, recent, friendsDifficulty } = useData();
  const total = friendsDifficulty.reduce((n, d) => n + d.val, 0);

  const rows = friends.slice(0, 4).map((f) => {
    const member = members.find((m) => m.username === f.username || m.name === f.name);
    // Their most recent solve in the group feed.
    const last = recent
      .filter((r) => r.who.some((p) => p.name === f.name))
      .reduce<RecentItem | undefined>((a, r) => (!a || (r.at ?? "") > (a.at ?? "") ? r : a), undefined);
    return {
      f,
      solved: member?.solved,
      line: last ? `Solved ${last.name} · ${fmtShortDate(last.at)}` : "Nothing recent",
    };
  });

  return (
    <Card className="flex h-full flex-col gap-4" onClick={onOpen}>
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 font-display text-[26px] leading-tight">Friends</h2>
        <span className="text-[13px] text-muted-foreground">Manage</span>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 border-t border-border pt-4 text-sm text-muted-foreground">
          Add friends to see what they're solving and compare progress.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map(({ f, solved, line }) => (
            <li key={f.id} className="flex items-center gap-3.5 border-t border-border py-3">
              <Avatar size="sm" initials={f.initials} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{f.name}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{line}</span>
              </span>
              {solved != null && <span className="font-mono text-sm">{solved}</span>}
            </li>
          ))}
        </ul>
      )}
      {total > 0 && (
        <div className="mt-auto flex flex-col gap-2.5">
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-sm">
            {friendsDifficulty.map((d) => (
              <span key={d.label} className={DIFF_BAR[d.label] ?? "bg-easy"} style={{ flex: d.val }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {friendsDifficulty.map((d) => (
              <span key={d.label}>
                {d.label} <span className="font-mono text-foreground">{d.val}</span>
              </span>
            ))}
            <span className="ml-auto">you + friends</span>
          </div>
        </div>
      )}
    </Card>
  );
}
