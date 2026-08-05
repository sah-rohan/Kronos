import { useEffect, useState } from "react";
import { Briefcase, ExternalLink } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { api, type JobAlert } from "../lib/api";

const SOURCE_LABEL: Record<string, string> = {
  "speedyapply":  "SpeedyApply",
  "simplify-swe": "SWE",
  "simplify-pm":  "PM",
};

const SOURCE_COLOR: Record<string, string> = {
  "speedyapply":  "bg-sky text-sky-foreground",
  "simplify-swe": "bg-coral/15 text-coral",
  "simplify-pm":  "bg-[#f5c26b]/20 text-[#a0720a] dark:text-[#f5c26b]",
};

export function JobAlertsCard({ onOpen }: { onOpen: () => void }) {
  const { getToken } = useData();
  const [jobs, setJobs] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .jobAlerts(getToken)
      .then((j) => setJobs(j ?? []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [getToken]);

  return (
    <Card className="lg:col-span-2 h-full" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[15px] font-medium">
          <Briefcase className="h-4 w-4 text-coral" />
          Job Alerts
        </div>
        <span className="text-xs text-muted-foreground">
          {jobs.length > 0 ? `${jobs.length} open roles` : "See all"}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {loading && (
          <li className="py-3 text-sm text-muted-foreground">Loading…</li>
        )}
        {!loading && jobs.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">
            No jobs fetched yet — the scraper runs hourly.
          </li>
        )}
        {jobs.slice(0, 5).map((j) => (
          <li
            key={j.id}
            className="flex items-center gap-4 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{j.company}</div>
              <div className="truncate text-xs text-muted-foreground">
                {j.role}
                {j.location ? ` · ${j.location}` : ""}
              </div>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                SOURCE_COLOR[j.source] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {SOURCE_LABEL[j.source] ?? j.source}
            </span>

            {j.applyUrl && (
              <a
                href={j.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-muted-foreground transition hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
