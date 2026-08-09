package api

import "context"

// getJobs serves GET /jobs for the Job Board dashboard card. It reads
// straight from the `jobs` table in Postgres, the same way every other GET
// route reads its own table - jobsync (a separate scheduled Lambda) is the
// only thing that ever writes to it. See backend/cmd/jobsync and
// backend/internal/store/jobs.go.
func (a *API) getJobs(ctx context.Context) (response, error) {
	rows, err := a.Store.Jobs(ctx, 500)
	return dataOrError(rows, err)
}
