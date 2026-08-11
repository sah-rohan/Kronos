package api

import (
	"context"
	"strconv"
	"time"

	"kronos/internal/jobs"
)

// getJobs serves GET /jobs for the Job Board dashboard card, one page at a
// time. It reads the single cached JSON file jobsync last wrote to S3 (see
// backend/cmd/jobsync and backend/internal/jobs/cache.go), then slices out
// just the page that was asked for - it never talks to GitHub itself.
//
// Pagination here is plain offset-based (?limit=20&offset=20, ...), unlike
// the SQL cursor version we tried earlier: this list comes from ONE S3 read,
// so the full slice is already sitting in memory and stable for the life of
// this one request - there's no "another request snuck a row in before
// yours" problem to design around, since it's not a live database being
// written to row by row. The only place the underlying data can change is
// jobsync's once-a-minute overwrite of the whole file, which is a separate
// concern from paging through one already-fetched snapshot.
func (a *API) getJobs(ctx context.Context, query map[string]string) (response, error) {
	if a.S3 == nil || a.JobsBucket == "" {
		// Job board isn't configured in this environment - respond with an
		// empty list instead of failing every dashboard load.
		return reply(200, jobsPage{Jobs: []jobs.Job{}})
	}

	payload, err := jobs.ReadCache(ctx, a.S3, a.JobsBucket, a.JobsKey)
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

	all := payload.Jobs
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
		ScrapedAt:  payload.ScrapedAt,
		NextOffset: nextOffset,
	})
}

// jobsPage is the shape of every GET /jobs response.
type jobsPage struct {
	Jobs       []jobs.Job `json:"jobs"`
	ScrapedAt  time.Time  `json:"scrapedAt"`
	NextOffset *int       `json:"nextOffset"`
}
