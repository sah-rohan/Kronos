package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"kronos/internal/config"
	"kronos/internal/jobs"
)

/*
jobsync is a scheduled Lambda for the Job Board dashboard item. EventBridge
invokes it every minute (see terraform/modules/scheduler) with an empty
event - this job doesn't read anything from the event, it just re-scrapes
both READMEs from scratch every time it runs and overwrites one JSON file in
S3 with the result.

Pipeline for one run:
  main -> run -> jobs.FetchSpeedyApplyJobs + jobs.FetchSimplifyJobsNewGrad -> jobs.WriteCache

The api Lambda's GET /jobs route (backend/internal/api/jobs.go) never talks
to GitHub itself - it only reads whatever this Lambda most recently wrote to
S3. Unlike the other scheduled Lambdas in this project (sync, enrich,
emailsync), jobsync never touches Postgres at all - the whole Job Board
feature is designed to need no database, just this one cached file.
*/

// run does one full scrape-and-cache pass: fetch both sources, combine them,
// and write the result to S3 as one JSON file.
func run(ctx context.Context, s3Client *s3.Client, bucket, key, githubToken string) error {
	// Step 1: scrape each source independently, so one source failing (e.g.
	// GitHub is briefly down) doesn't block the other from being cached.
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

	// Step 2: write the combined list to S3. ScrapedAt is stamped here (not
	// by the api Lambda) so it reflects when the data was actually fetched.
	payload := jobs.CachePayload{ScrapedAt: time.Now().UTC(), Jobs: all}
	return jobs.WriteCache(ctx, s3Client, bucket, key, payload)
}

func main() {
	ctx := context.Background()

	// The AWS SDK config (region, credentials) comes from the Lambda
	// execution environment automatically - nothing to configure here.
	awsCfg, err := awscfg.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatal(err)
	}
	s3Client := s3.NewFromConfig(awsCfg)

	bucket := os.Getenv("JOBS_BUCKET")
	key := os.Getenv("JOBS_KEY")
	if key == "" {
		key = "jobs.json"
	}

	lambda.Start(func(ctx context.Context) error {
		// GitHub token is required at this cadence: 2 requests/minute would
		// blow past GitHub's 60/hour unauthenticated limit. See the
		// GITHUB_TOKEN SSM comment in terraform/main.tf.
		githubToken := config.Get(ctx, "GITHUB_TOKEN")
		return run(ctx, s3Client, bucket, key, githubToken)
	})
}
