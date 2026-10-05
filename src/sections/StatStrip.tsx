import { useData } from "../data/context";
import { plural } from "../lib/format";
import { inList } from "../lib/roadmaps";
import { rankMembers } from "../lib/rank";
import { ALL_MODULES } from "../systemdesign/catalog";
import { useSdSolved } from "../systemdesign/progress";
import type { ProblemList } from "../types";

const DASH = "–";

function Stat({ label, value, unit, first }: { label: string; value: string | number; unit?: string; first?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 py-5 pr-4 sm:py-[22px] ${first ? "" : "sm:border-l sm:border-border sm:pl-6"}`}>
      <span className="eyebrow">{label}</span>
      <span className="font-display text-[40px] font-light leading-none sm:text-[44px]">
        {value}
        {unit && <span className="text-xl text-muted-foreground"> {unit}</span>}
      </span>
    </div>
  );
}

export function StatStrip({ userName, roadmap, locked }: { userName: string; roadmap: ProblemList; locked: boolean }) {
  const { categories, members, calendar, getToken } = useData();
  const sdSolved = useSdSolved(getToken);
  const items = categories.flatMap((c) => c.items).filter((p) => inList(p, roadmap));
  const ranked = rankMembers(members, roadmap);
  const me = ranked.find((r) => r.m.name === userName);

  return (
    <section aria-label="Summary" className="grid grid-cols-2 border-t border-b border-t-foreground border-b-border sm:grid-cols-4">
      <Stat first label="Solved" value={locked ? DASH : items.filter((p) => p.done).length} unit={`/ ${items.length}`} />
      <Stat label="Streak" value={locked ? DASH : calendar.streak} unit={plural(calendar.streak, "day")} />
      <Stat label="Rank" value={locked || !me ? DASH : me.rank} unit={ranked.length ? `of ${ranked.length}` : undefined} />
      <Stat
        label="Design modules"
        value={ALL_MODULES.filter((p) => sdSolved.has(p.slug)).length}
        unit={`/ ${ALL_MODULES.length}`}
      />
    </section>
  );
}
