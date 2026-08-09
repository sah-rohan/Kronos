package store

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// JobRow is one job posting as stored in Postgres and served to the
// frontend. It mirrors jobs.Job (backend/internal/jobs/job.go) field for
// field, but the store package intentionally does not import the jobs
// package - store only knows about plain data, never about how that data
// was scraped. backend/cmd/jobsync is the glue that converts one into the
// other.
type JobRow struct {
	ID            string `json:"id"`
	Company       string `json:"company"`
	Position      string `json:"position"`
	Location      string `json:"location"`
	Salary        string `json:"salary,omitempty"`
	PostingURL    string `json:"postingUrl,omitempty"`
	Age           string `json:"age,omitempty"`
	Closed        bool   `json:"closed"`
	SourceRepo    string `json:"sourceRepo"`
	SourceSection string `json:"sourceSection"`
}

// UpsertJobs inserts newly-seen jobs and refreshes last_seen_at for jobs
// that were already in the table. It's called once per jobsync run with
// every job scraped from GitHub that pass. Because id is a stable hash of
// (company, position, postingURL) - see jobs.newID - re-scraping the same
// posting on the next hourly run updates the existing row in place instead
// of inserting a duplicate.
func (p *Postgres) UpsertJobs(ctx context.Context, rows []JobRow) (int, error) {
	if len(rows) == 0 {
		return 0, nil
	}

	batch := &pgx.Batch{}
	for _, r := range rows {
		batch.Queue(`
			insert into jobs
				(id, company, position, location, salary, posting_url, age, closed, source_repo, source_section, first_seen_at, last_seen_at)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
			on conflict (id) do update set
				location    = excluded.location,
				salary      = excluded.salary,
				posting_url = excluded.posting_url,
				age         = excluded.age,
				closed      = excluded.closed,
				last_seen_at = now()
		`, r.ID, r.Company, r.Position, r.Location, r.Salary, r.PostingURL, r.Age, r.Closed, r.SourceRepo, r.SourceSection)
	}

	br := p.pool.SendBatch(ctx, batch)
	defer br.Close()
	for range rows {
		if _, err := br.Exec(); err != nil {
			return 0, err
		}
	}
	return len(rows), nil
}

// Jobs returns the job board list, most-recently-first-seen-by-us first.
// Only jobs seen within the last 6 hours are returned: jobsync re-scrapes
// both READMEs in full roughly every hour (see terraform/modules/scheduler),
// so a job that's been missing for 6 hours straight has almost certainly
// closed or been removed from the source repo. Rows are never deleted
// though - a stale row just stops being returned here - so a future
// email-sync Lambda can still look one up by ID for history.
func (p *Postgres) Jobs(ctx context.Context, limit int) ([]JobRow, error) {
	rows, err := p.pool.Query(ctx, `
		select id, company, position, location, salary, posting_url, age, closed, source_repo, source_section
		from jobs
		where last_seen_at > now() - interval '6 hours'
		order by first_seen_at desc
		limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []JobRow{}
	for rows.Next() {
		var r JobRow
		if err := rows.Scan(&r.ID, &r.Company, &r.Position, &r.Location, &r.Salary, &r.PostingURL, &r.Age, &r.Closed, &r.SourceRepo, &r.SourceSection); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
