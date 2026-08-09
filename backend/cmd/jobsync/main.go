package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/lambda"

	"kronos/internal/config"
	"kronos/internal/jobs"
	"kronos/internal/store"
)

/*
jobsync is a scheduled Lambda for the Job Board dashboard item. EventBridge
invokes it on a cadence (see terraform/modules/scheduler, default hourly)
with an empty event - this job doesn't read anything from the event, it just
re-scrapes both READMEs from scratch every time it runs and saves the result
to Postgres.

Pipeline for one run:
  main -> run -> jobs.FetchSpeedyApplyJobs + jobs.FetchSimplifyJobsNewGrad -> toRows -> store.UpsertJobs

The api Lambda's GET /jobs route (backend/internal/api/jobs.go) never talks
to GitHub itself - it only reads whatever is currently in the `jobs` table,
the same way it reads `problems`/`solves` for the LeetCode side of the
dashboard. jobsync is the only thing that writes to that table.
*/

// run does one full scrape-and-store pass.
func run(ctx context.Context, db *store.Postgres, githubToken string) error {
	// Step 1: scrape each source independently, so one source failing (e.g.
	// GitHub is briefly down) doesn't block the other from being saved.
	speedyJobs, err := jobs.FetchSpeedyApplyJobs(ctx, githubToken)
	if err != nil {
		log.Printf("speedyapply: %v", err)
	}
	simplifyJobs, err := jobs.FetchSimplifyJobsNewGrad(ctx, githubToken)
	if err != nil {
		log.Printf("simplifyjobs: %v", err)
	}

	all := append(speedyJobs, simplifyJobs...)
	log.Printf("scraped %d jobs (%d speedyapply, %d simplifyjobs)", len(all), len(speedyJobs), len(simplifyJobs))

	// Step 2: upsert into Postgres. See store.UpsertJobs - a job that's
	// already in the table gets its last_seen_at refreshed instead of being
	// inserted a second time.
	n, err := db.UpsertJobs(ctx, toRows(all))
	if err != nil {
		return err
	}
	log.Printf("upserted %d jobs", n)
	return nil
}

// toRows converts the scrape layer's Job structs (backend/internal/jobs)
// into the store layer's JobRow structs (backend/internal/store). Keeping
// these as two separate types - even though their fields line up 1:1 today -
// means the DB schema and the GitHub-scraping logic can change independently
// of each other; this function is the only place that has to know about both.
func toRows(items []jobs.Job) []store.JobRow {
	rows := make([]store.JobRow, len(items))
	for i, j := range items {
		rows[i] = store.JobRow{
			ID:            j.ID,
			Company:       j.Company,
			Position:      j.Position,
			Location:      j.Location,
			Salary:        j.Salary,
			PostingURL:    j.PostingURL,
			Age:           j.Age,
			Closed:        j.Closed,
			SourceRepo:    j.SourceRepo,
			SourceSection: j.SourceSection,
		}
	}
	return rows
}

func main() {
	ctx := context.Background()

	db, err := store.NewPostgres(ctx, config.Get(ctx, "DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}

	lambda.Start(func(ctx context.Context) error {
		// Optional: config.Get checks the plain GITHUB_TOKEN env var first,
		// then a GITHUB_TOKEN_SSM secret if one is configured. Neither is
		// set today - fetchReadme works fine unauthenticated too, see its
		// comment in backend/internal/jobs/github.go.
		githubToken := config.Get(ctx, "GITHUB_TOKEN")
		return run(ctx, db, githubToken)
	})
}
