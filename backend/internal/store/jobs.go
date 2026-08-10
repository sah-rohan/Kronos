package store

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

// JobRow is one job posting as stored in Postgres and served to the
// frontend. It mirrors jobs.Job (backend/internal/jobs/job.go) field for
// field, but the store package intentionally does not import the jobs
// package - store only knows about plain data, never about how that data
// was scraped. backend/cmd/jobsync is the glue that converts one into the
// other.
type JobRow struct {
	ID            string    `json:"id"`
	Company       string    `json:"company"`
	Position      string    `json:"position"`
	Location      string    `json:"location"`
	Salary        string    `json:"salary,omitempty"`
	PostingURL    string    `json:"postingUrl,omitempty"`
	Age           string    `json:"age,omitempty"`
	Closed        bool      `json:"closed"`
	SourceRepo    string    `json:"sourceRepo"`
	SourceSection string    `json:"sourceSection"`
	FirstSeenAt   time.Time `json:"firstSeenAt"`
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

// Jobs returns one page of the job board list, most-recently-first-seen
// first. Only jobs seen within the last 6 hours are returned (see the old
// comment on staleness - that part is unchanged).
//
// Pagination: pass beforeID = "" and a zero time.Time for the very first
// page. For every page after that, pass the ID and FirstSeenAt of the LAST
// job from the previous page - the api Lambda sends these back to the
// frontend as "nextCursor", and the frontend sends them right back as
// beforeId/beforeTime when it asks for more. That tells this query "give me
// jobs that come after that one in the sort order."
//
// This is why it's safe even though jobsync inserts new rows every minute:
// a plain "OFFSET 20" approach would shift every later page by one slot
// whenever a new job sneaks in between two page loads, causing skipped or
// duplicated rows. Anchoring to an actual row's position instead of a
// row count sidesteps that entirely.
func (p *Postgres) Jobs(ctx context.Context, limit int, beforeID string, beforeTime time.Time) ([]JobRow, error) {
      rows, err := p.pool.Query(ctx, `
              select id, company, position, location, salary, posting_url, age, closed, source_repo, source_section, first_seen_at
              from jobs
              where last_seen_at > now() - interval '6 hours'
                and ($1 = '' or first_seen_at < $2 or (first_seen_at = $2 and id < $1))
              order by first_seen_at desc, id desc
              limit $3`, beforeID, beforeTime, limit)
      if err != nil {
              return nil, err
      }
      defer rows.Close()

      out := []JobRow{}
      for rows.Next() {
              var r JobRow
              if err := rows.Scan(&r.ID, &r.Company, &r.Position, &r.Location, &r.Salary, &r.PostingURL, &r.Age, &r.Closed, &r.SourceRepo, &r.SourceSection, &r.FirstSeenAt); err != nil {
                      return nil, err
              }
              out = append(out, r)
      }
      return out, rows.Err()
}
