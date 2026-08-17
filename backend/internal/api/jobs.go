package api

import (
	"context"
	"log"
	"strconv"
	"sync"
	"time"

	"kronos/internal/jobs"
)

// memTTL is how long one scrape is reused before the next request re-fetches
// from GitHub. This is the only thing standing between "every dashboard load
// scrapes two READMEs" and a sane request rate, so it's deliberately longer
// than the browser's own 2-minute localStorage TTL in src/lib/jobsCache.ts.
const memTTL = 5 * time.Minute

// The job list is cached in plain process memory - no S3, no database, no
// file on disk. AWS keeps a Lambda container alive between invocations when
// requests keep coming, and package-level variables survive for the life of
// that container, so consecutive requests reuse one scrape for free. When
// the container is eventually recycled these reset to their zero values and
// the next request just scrapes again, which is exactly what a cache should
// do. Nothing here needs to persist: the source of truth is the two public
// GitHub READMEs, which can be re-read at any moment.
var (
	jobsMu     sync.Mutex
	jobsCached []jobs.Job
	jobsAt     time.Time
)

// cachedJobs returns the scraped job list, re-fetching from GitHub only when
// the in-memory copy is missing or older than memTTL.
//
// The mutex is held across the network call on purpose. It means two
// simultaneous cold requests don't both scrape - the second one blocks, then
// finds the first one's result already cached and returns it. Serializing a
// slow path is the right trade here, since the alternative is a burst of
// duplicate scrapes every time the cache expires.
func (a *API) cachedJobs(ctx context.Context) ([]jobs.Job, time.Time, error) {
	jobsMu.Lock()
	defer jobsMu.Unlock()

	if !jobsAt.IsZero() && time.Since(jobsAt) < memTTL {
		return jobsCached, jobsAt, nil
	}

	// Scrape each source independently so one failing (GitHub briefly down,
	// a README's table format changed) doesn't cost us the other one.
	speedyJobs, errSpeedy := jobs.FetchSpeedyApplyJobs(ctx, a.GithubToken)
	if errSpeedy != nil {
		log.Printf("speedyapply: %v", errSpeedy)
	}
	simplifyJobs, errSimplify := jobs.FetchSimplifyJobsNewGrad(ctx, a.GithubToken)
	if errSimplify != nil {
		log.Printf("simplifyjobs: %v", errSimplify)
	}

	if errSpeedy != nil && errSimplify != nil {
		// Both sources failed. Rather than caching an empty list (which
		// would wedge the board as empty for the whole TTL), keep serving
		// the last good scrape if we still have one.
		if jobsCached != nil {
			return jobsCached, jobsAt, nil
		}
		return nil, time.Time{}, errSpeedy
	}

	jobsCached = append(speedyJobs, simplifyJobs...)
	jobsAt = time.Now().UTC()
	log.Printf("scraped %d jobs (%d speedyapply, %d simplifyjobs)", len(jobsCached), len(speedyJobs), len(simplifyJobs))

	return jobsCached, jobsAt, nil
}

// getJobs serves GET /jobs for the Job Board dashboard card, one page at a
// time. It scrapes the two public GitHub READMEs directly (via the fetchers
// in kronos/internal/jobs) and slices out just the page that was asked for.
//
// There is no server-side store behind this route. The job data is derived
// from a public source rather than owned by us, so it's re-fetchable at any
// time, which makes any copy we keep a cache rather than a record. Two
// caches already cover that: cachedJobs above (process memory, 5 min) and
// the browser's localStorage in src/lib/jobsCache.ts (2 min).
//
// Pagination is plain offset-based (?limit=20&offset=20, ...) rather than
// the SQL cursor version we tried earlier: the full list is already sitting
// in memory and stable for the life of one request, so there's no "another
// request snuck a row in before yours" problem to design around.
func (a *API) getJobs(ctx context.Context, query map[string]string) (response, error) {
	all, scrapedAt, err := a.cachedJobs(ctx)
	if err != nil {
		return serverError(err)
	}

	limit := 20
	if v := query["limit"]; v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	offset := 0
	if v := query["offset"]; v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	page := []jobs.Job{}
	var nextOffset *int // nil means "no more pages" - encoded as JSON null

	if offset < len(all) {
		end := offset + limit
		if end > len(all) {
			end = len(all)
		}
		page = all[offset:end]
		if end < len(all) {
			n := end
			nextOffset = &n
		}
	}

	return reply(200, jobsPage{
		Jobs:       page,
		ScrapedAt:  scrapedAt,
		NextOffset: nextOffset,
	})
}

// jobsPage is the shape of every GET /jobs response.
type jobsPage struct {
	Jobs       []jobs.Job `json:"jobs"`
	ScrapedAt  time.Time  `json:"scrapedAt"`
	NextOffset *int       `json:"nextOffset"`
}
