import { useData } from "../data/source";
import { inList } from "../lib/roadmaps";
import { rankMembers } from "../lib/rank";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";
import { useSdSolved } from "../systemdesign/progress";
import type { ProblemList } from "../types";

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
  const modules = [...SD_PROBLEMS, ...GENAI_PROBLEMS];
  const dash = "–";

  return (
    <section
      aria-label="Summary"
      className="grid grid-cols-2 border-t border-b border-t-foreground border-b-border sm:grid-cols-4"
    >
      <Stat first label="Solved" value={locked ? dash : items.filter((p) => p.done).length} unit={`/ ${items.length}`} />
      <Stat label="Streak" value={locked ? dash : calendar.streak} unit={calendar.streak === 1 ? "day" : "days"} />
      <Stat label="Rank" value={locked || !me ? dash : me.rank} unit={ranked.length ? `of ${ranked.length}` : undefined} />
      <Stat label="Design modules" value={modules.filter((p) => sdSolved.has(p.slug)).length} unit={`/ ${modules.length}`} />
    </section>
  );
}
