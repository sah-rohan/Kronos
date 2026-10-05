import { Card } from "../components/Card";
import { DiffLabel } from "../components/Controls";
import { useData } from "../data/context";
import { useFetch } from "../data/hooks";
import { api, type SdActivity } from "../lib/api";
import { fmtShortDate } from "../lib/date";
import { moduleBySlug } from "../systemdesign/catalog";

type Row = { key: string; label: string; at?: string } & ({ diff: string } | { slug: string });

const time = (at?: string) => (at ? Date.parse(at) : 0);

export function RecentActivityCard({
  onOpen,
  onOpenModule,
  userName,
}: {
  onOpen: () => void;
  onOpenModule: (slug: string) => void;
  userName: string;
}) {
  const { recent, getToken } = useData();
  const sd = useFetch("me", () => api.mySdActivity(getToken), [] as SdActivity[]);

  // Your LeetCode solves and design-module completions in one timeline.
  const rows: Row[] = [
    ...recent
      .filter((r) => r.who.some((p) => p.name === userName))
      .map((r) => ({ key: `lc${r.n}`, label: r.name, at: r.at, diff: ["Easy", "Medium", "Hard"].includes(r.diff) ? r.diff : "Medium" })),
    ...sd.map((a) => ({ key: `sd${a.slug}`, label: moduleBySlug(a.slug)?.title ?? a.slug, at: a.at, slug: a.slug })),
  ].sort((a, b) => time(b.at) - time(a.at));

  return (
    <Card className="lg:col-span-1 h-full" onClick={onOpen}>
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 font-display text-[26px] leading-tight">Recent</h2>
        <span className="text-[13px] text-muted-foreground">See all</span>
      </div>
      <ul className="mt-2.5">
        {rows.length === 0 && <li className="py-3 text-sm text-muted-foreground">No activity yet.</li>}
        {rows.slice(0, 5).map((r) => (
          <li
            key={r.key}
            onClick={
              "slug" in r
                ? (e) => {
                    e.stopPropagation();
                    onOpenModule(r.slug);
                  }
                : undefined
            }
            className={`flex items-center gap-4 border-t border-border py-3.5 ${"slug" in r ? "cursor-pointer" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px]">{r.label}</div>
              {r.at && <div className="text-[13px] text-muted-foreground">{fmtShortDate(r.at)}</div>}
            </div>
            {"slug" in r ? <span className="eyebrow shrink-0">Module</span> : <DiffLabel diff={r.diff} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}
