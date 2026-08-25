package main

import (
	"context"
	"log"
	"os"
	"strconv"

	"github.com/aws/aws-lambda-go/lambda"

	"kronos/internal/config"
	"kronos/internal/platform/db"
	"kronos/internal/syncing"
)

// The DB pool, secrets, and season are resolved once at cold start and reused
// across invocations, so the per-minute cron doesn't re-decrypt SSM secrets
// (KMS) or reopen the pool on every run.
func main() {
	ctx := context.Background()

	pool, err := db.Open(ctx, config.Get(ctx, "DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}

	season, _ := strconv.ParseInt(os.Getenv("SEASON_START"), 10, 64)
	svc := syncing.NewService(
		syncing.NewRepo(pool),
		config.Get(ctx, "LEETCODE_SESSION"),
		season,
	)

	lambda.Start(func(ctx context.Context) error { return svc.RunOnce(ctx) })
}
