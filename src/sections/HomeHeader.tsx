import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useData } from "../data/context";
import { api } from "../lib/api";
import { greeting } from "../lib/date";

export function HomeHeader({ userName, locked }: { userName: string; locked: boolean }) {
  const { refresh, getToken } = useData();
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

  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-xl flex-col gap-3.5">
        <span className="eyebrow">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
        <h1 className="m-0 font-display text-[clamp(40px,5vw,60px)] font-light leading-[1.02] tracking-[-0.02em]">
          {greeting(now)}, {userName.split(" ")[0]}.
        </h1>
        {locked && (
          <p className="m-0 text-base leading-relaxed text-muted-foreground">
            Link your LeetCode username to start tracking your progress against the group.
          </p>
        )}
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
      </div>
    </header>
  );
}
