import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useData } from "../data/source";
import { api } from "../lib/api";
import { greeting } from "../lib/greeting";
import { ROADMAP_LABEL, inList } from "../lib/roadmaps";
import { rankMembers } from "../lib/rank";
import { leetcodeUrl } from "../data/problems";
import type { ProblemList } from "../types";

function summary(total: number, remaining: number, label: string, standing: string) {
  if (total === 0) return "Sync to pull in your latest LeetCode progress.";
  if (remaining === 0) return `You've finished ${label}.`;
  return `You're ${remaining} problem${remaining === 1 ? "" : "s"} from finishing ${label}.${standing}`;
}

export function HomeHeader({
  userName,
  roadmap,
  locked,
}: {
  userName: string;
  roadmap: ProblemList;
  locked: boolean;
}) {
  const { categories, members, refresh, getToken } = useData();
  const [syncing, setSyncing] = useState(false);
  const now = new Date();

  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await api.syncNow(getToken).catch(() => {});
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const label = ROADMAP_LABEL[roadmap];
  const items = categories.flatMap((c) => c.items).filter((p) => inList(p, roadmap));
  const next = items.find((p) => !p.done);
  const ranked = rankMembers(members, roadmap);
  const me = ranked.find((r) => r.m.name === userName);
  const top = ranked[0];
  const gap = me && top ? top.solved - me.solved : 0;
  const standing = !me || ranked.length < 2 ? "" : gap > 0 ? ` ${top.m.name.split(" ")[0]} is ${gap} ahead.` : " You're leading the group.";
  const line = locked
    ? "Link your LeetCode username to start tracking your progress against the group."
    : summary(items.length, items.length - items.filter((p) => p.done).length, label, standing);

  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-xl flex-col gap-3.5">
        <span className="eyebrow">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
        <h1 className="m-0 font-display text-[clamp(40px,5vw,60px)] font-light leading-[1.02] tracking-[-0.02em]">
          {greeting(now)}, {userName.split(" ")[0]}.
        </h1>
        <p className="m-0 text-base leading-relaxed text-muted-foreground">{line}</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={doSync}
          disabled={syncing}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-[18px] text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-[15px] w-[15px] ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync"}
        </button>
        {next && !locked && (
          <a
            href={leetcodeUrl(next.slug)}
            target="_blank"
            rel="noreferrer"
            title={next.name}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-[18px] text-sm font-medium text-ink-foreground transition-opacity hover:opacity-90"
          >
            Start next problem
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </header>
  );
}
