import { api, type JobsPage, type TokenFn } from "./api";

// Browser-side cache for GET /jobs pages, stored in localStorage. This sits
// entirely in front of the existing pipeline (jobsync -> S3 -> GET /jobs) -
// nothing server-side changes. It just means reopening the Job Board modal,
// or the card re-mounting, within a short window doesn't always trigger a
// fresh network call for data we already have.
//
// How long a cached page is considered fresh enough to reuse. The backend's
// own cache (the S3 file) only refreshes once a minute (see
// backend/cmd/jobsync), so anything in this ballpark just avoids redundant
// requests - it's not serving meaningfully staler data than the server
// would anyway.
const TTL_MS = 2 * 60 * 1000; // 2 minutes

type CacheEntry = { page: JobsPage; cachedAt: number };

// Each distinct (limit, offset) pair - i.e. each distinct page - gets its
// own cache entry, since they hold different jobs.
function cacheKey(limit: number, offset: number): string {
  return `kronos:jobs:${limit}:${offset}`;
}

function readCache(limit: number, offset: number): JobsPage | null {
  try {
    const raw = localStorage.getItem(cacheKey(limit, offset));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > TTL_MS) return null; // stale - treat as a miss
    return entry.page;
  } catch {
    // localStorage can throw (private browsing, corrupted JSON, storage
    // disabled) - caching is an optimization, never let it break the page.
    return null;
  }
}

function writeCache(limit: number, offset: number, page: JobsPage): void {
  try {
    const entry: CacheEntry = { page, cachedAt: Date.now() };
    localStorage.setItem(cacheKey(limit, offset), JSON.stringify(entry));
  } catch {
    // Storage full or unavailable - just skip caching this time.
  }
}

// fetchJobsPage is what JobBoardCard/JobBoardModal call instead of
// api.jobs() directly: it transparently serves a fresh-enough cached page
// when one exists, and otherwise falls through to the real network request
// (caching that result for next time).
export async function fetchJobsPage(getToken: TokenFn, limit: number, offset: number): Promise<JobsPage> {
  const cached = readCache(limit, offset);
  if (cached) return cached;

  const page = await api.jobs(getToken, limit, offset);
  writeCache(limit, offset, page);
  return page;
}
