import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ABOVE_STRETCH, EntryPoint } from "../components/EntryPoint";
import { useData } from "../data/context";
import { api, type SdActivity } from "../lib/api";
import { diffStyles } from "../data/problems";
import { fmtShortDate } from "../lib/date";
import { paths } from "../lib/slugs";
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
  | {
      key: string;
      kind: "sd";
      label: string;
      at?: string;
      slug: string;
      genai: boolean;
    };

function isDiff(s: string): s is "Easy" | "Medium" | "Hard" {
  return s === "Easy" || s === "Medium" || s === "Hard";
}

export function RecentActivityCard({ userName }: { userName: string }) {
  const { recent, getToken } = useData();
  const [sd, setSd] = useState<SdActivity[]>([]);

  useEffect(() => {
    api
      .mySdActivity(getToken)
      .then((a) => setSd(a ?? []))
      .catch(() => setSd([]));
  }, [getToken]);

  // slug -> title, plus which curriculum the slug belongs to, so a row can build
  // the right route without the caller having to know.
  const moduleBySlug = useMemo(() => {
    const m = new Map<string, { title: string; genai: boolean }>();
    for (const p of SD_PROBLEMS) m.set(p.slug, { title: p.title, genai: false });
    for (const p of GENAI_PROBLEMS) m.set(p.slug, { title: p.title, genai: true });
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
    ...sd.map((a): Row => {
      const meta = moduleBySlug.get(a.slug);
      return {
        key: `sd${a.slug}`,
        kind: "sd",
        label: meta?.title ?? a.slug,
        at: a.at,
        slug: a.slug,
        genai: meta?.genai ?? false,
      };
    }),
  ].sort(
    (a, b) => (b.at ? Date.parse(b.at) : 0) - (a.at ? Date.parse(a.at) : 0),
  );

  return (
    <EntryPoint
      to={paths.activity()}
      action="View all"
      ariaLabel="View all activity"
      className="h-full lg:col-span-1"
    >
      <div className="text-[15px] font-medium">Recent Activity</div>

      <ul className="mt-4 divide-y divide-border">
        {rows.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">No activity yet.</li>
        )}
        {rows.slice(0, 5).map((r) => {
          const body = (
            <>
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
            </>
          );
          return (
            <li key={r.key}>
              {r.kind === "sd" ? (
                // A module row links to its own module. It has to sit above the
                // card's stretched hit area to stay clickable.
                <Link
                  to={
                    r.genai
                      ? paths.genaiModule(r.slug)
                      : paths.systemDesignModule(r.slug)
                  }
                  className={`${ABOVE_STRETCH} flex items-center gap-4 rounded-xl py-3.5 transition hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-4 py-3.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </EntryPoint>
  );
}
