import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { api, type ApiJob } from "../lib/api";

// JobBoardCard is the dashboard tile for the Job Board feature. It shows a
// short preview (top 5) of new-grad/internship postings that the jobsync
// Lambda scraped from public GitHub job-list repos and cached in S3 - this
// component never talks to GitHub, only to our own GET /jobs route.
// Clicking the card opens JobBoardModal for the full, searchable list.
export function JobBoardCard({ onOpen }: { onOpen: () => void }) {
  const { getToken } = useData();
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .jobs(getToken, 5)
      .then((page) => setJobs(page.jobs ?? []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [getToken]);

  return (
    <Card className="lg:col-span-1 h-full" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">Job Board</div>
        <Briefcase className="h-4 w-4 text-coral" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        New grad &amp; internship roles, scraped from GitHub every minute.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {loading && (
          <li className="py-3 text-sm text-muted-foreground">Loading…</li>
        )}
        {!loading && jobs.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">
            No jobs yet — check back soon.
          </li>
        )}
        {jobs.slice(0, 5).map((j) => (
          <li key={j.id} className="flex items-center gap-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">
                {j.company} — {j.position}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {j.location}
              </div>
            </div>
            {j.age && (
              <span className="shrink-0 rounded-full bg-sky px-2.5 py-1 text-[11px] font-medium text-sky-foreground">
                {j.age}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
