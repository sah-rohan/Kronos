import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { api, type SdActivity } from "../lib/api";
import { diffStyles } from "../data/problems";
import { fmtShortDate } from "../lib/date";
import { SD_PROBLEMS } from "../systemdesign/problems";
import { GENAI_PROBLEMS } from "../systemdesign/genai";

type Row =
  | {
      key: string;
      kind: "lc";
      label: string;
      at?: string;
      diff: "Easy" | "Medium" | "Hard";
    }
  | { key: string; kind: "sd"; label: string; at?: string; slug: string };

function isDiff(s: string): s is "Easy" | "Medium" | "Hard" {
  return s === "Easy" || s === "Medium" || s === "Hard";
}

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
  const [sd, setSd] = useState<SdActivity[]>([]);

  useEffect(() => {
    api
      .mySdActivity(getToken)
      .then((a) => setSd(a ?? []))
      .catch(() => setSd([]));
  }, [getToken]);

  const titleBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of [...SD_PROBLEMS, ...GENAI_PROBLEMS]) m.set(p.slug, p.title);
    return m;
  }, []);

  // Merge LeetCode solves and System Design completions into one timeline.
  const rows: Row[] = [
    ...recent
      .filter((r) => r.who.some((p) => p.name === userName))
      .map(
        (r): Row => ({
          key: `lc${r.n}`,
          kind: "lc",
          label: r.name,
          at: r.at,
          diff: isDiff(r.diff) ? r.diff : "Medium",
        }),
      ),
    ...sd.map(
      (a): Row => ({
        key: `sd${a.slug}`,
        kind: "sd",
        label: titleBySlug.get(a.slug) ?? a.slug,
        at: a.at,
        slug: a.slug,
      }),
    ),
  ].sort(
    (a, b) => (b.at ? Date.parse(b.at) : 0) - (a.at ? Date.parse(a.at) : 0),
  );

  return (
    <Card className="lg:col-span-1 h-full" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">Recent Activity</div>
        <span className="text-xs text-muted-foreground">See all</span>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {rows.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">
            No activity yet.
          </li>
        )}
        {rows.slice(0, 5).map((r) => (
          <li
            key={r.key}
            onClick={
              r.kind === "sd"
                ? (e) => {
                    e.stopPropagation();
                    onOpenModule(r.slug);
                  }
                : undefined
            }
            className={`flex items-center gap-4 py-3.5 ${r.kind === "sd" ? "cursor-pointer" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{r.label}</div>
              {r.at && (
                <div className="text-xs text-muted-foreground">
                  {fmtShortDate(r.at)}
                </div>
              )}
            </div>
            {r.kind === "lc" ? (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${diffStyles[r.diff]}`}
              >
                {r.diff}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-coral/15 px-2.5 py-1 text-[11px] font-medium text-coral">
                Module
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
