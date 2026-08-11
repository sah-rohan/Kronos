import { useEffect, useMemo, useState } from "react";
import { Search, ExternalLink, Lock } from "lucide-react";
import { Modal } from "../components/Modal";
import { useData } from "../data/source";
import { api, type ApiJob } from "../lib/api";

// JobBoardModal is the full-list view behind the Job Board card: every job
// currently cached in S3 (from GET /jobs - see backend/internal/jobs/cache.go),
// with a text search and a section filter (e.g. "FAANG+", "Software
// Engineering"). It fetches its own data independently of JobBoardCard's
// preview fetch, the same way FriendsModal/LeaderboardModal fetch their own
// full lists.
export function JobBoardModal({ onClose }: { onClose: () => void }) {
  const { getToken } = useData();
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<string | null>(null);

  useEffect(() => {
    api
      .jobs(getToken, 20, 0)
      .then((page) => {
        setJobs(page.jobs ?? []);
        setNextOffset(page.nextOffset);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [getToken]);

  // Fetches the next page starting at nextOffset (from the last response),
  // and appends it to what's already on screen (rather than replacing it).
  const loadMore = () => {
    if (nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    api
      .jobs(getToken, 20, nextOffset)
      .then((page) => {
        setJobs((prev) => [...prev, ...(page.jobs ?? [])]);
        setNextOffset(page.nextOffset);
      })
      .finally(() => setLoadingMore(false));
  };

  // The chip bar: one chip per distinct sourceSection seen in the data
  // (e.g. "FAANG+", "Quant", "Other", "Software Engineering", "Product
  // Management"), in the order they first appear.
  const sections = useMemo(() => {
    const seen: string[] = [];
    for (const j of jobs) if (!seen.includes(j.sourceSection)) seen.push(j.sourceSection);
    return seen;
  }, [jobs]);

  const q = query.trim().toLowerCase();
  const shown = jobs.filter((j) => {
    if (section && j.sourceSection !== section) return false;
    if (!q) return true;
    return (
      j.company.toLowerCase().includes(q) ||
      j.position.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    );
  });

  return (
    <Modal title="Job Board" onClose={onClose}>
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, role, or location…"
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {sections.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setSection(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              section === null ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All
          </button>
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                section === s ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {loading && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Loading…
          </li>
        )}
        {!loading && shown.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No jobs match.
          </li>
        )}
        {shown.map((j) => {
          const row = (
            <div className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3 transition hover:bg-muted">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {j.company} <span className="text-muted-foreground">·</span> {j.position}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {j.location}
                  {j.salary ? ` · ${j.salary}` : ""}
                </div>
              </div>
              {j.closed ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" /> Closed
                </span>
              ) : (
                j.age && (
                  <span className="shrink-0 rounded-full bg-sky px-2.5 py-1 text-[11px] font-medium text-sky-foreground">
                    {j.age}
                  </span>
                )
              )}
              {j.postingUrl && !j.closed && (
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          );
          return (
            <li key={j.id}>
              {j.postingUrl && !j.closed ? (
                <a href={j.postingUrl} target="_blank" rel="noreferrer">
                  {row}
                </a>
              ) : (
                row
              )}
            </li>
          );
        })}
        {nextOffset !== null && (
          <li>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-center text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </li>
        )}
      </ul>
    </Modal>
  );
}
