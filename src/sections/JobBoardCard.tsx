import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { Card } from "../components/Card";
import { useData } from "../data/source";
import { type ApiJob } from "../lib/api";
import { fetchJobsPage } from "../lib/jobsCache";

// How many jobs to show in the card's own scrollable preview - bigger than
// a plain top-5 slice (matching CloudCard/NetworkingCard/GenAICard's
// pattern of a scrollable list right on the dashboard tile, before you even
// open the full modal), but still well short of the modal's full paginated
// list.
const PREVIEW_COUNT = 20;

// JobBoardCard is the dashboard tile for the Job Board feature. It shows a
// scrollable preview of new-grad/internship postings that the jobsync
// Lambda scraped from public GitHub job-list repos and cached in S3 - this
// component never talks to GitHub, only to our own GET /jobs route.
// Clicking the card opens JobBoardModal for the full, searchable list.
export function JobBoardCard({ onOpen }: { onOpen: () => void }) {
  const { getToken } = useData();
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobsPage(getToken, PREVIEW_COUNT, 0)
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
      <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Job Board</span>
        <span>{jobs.length} shown</span>
      </div>
      <ul className="modal-scroll mt-3 h-72 space-y-2 overflow-y-auto pr-1">
        {loading && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Loading…
          </li>
        )}
        {!loading && jobs.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No jobs yet — check back soon.
          </li>
        )}
        {jobs.map((j) => (
          <li
            key={j.id}
            className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {j.company} — {j.position}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
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
