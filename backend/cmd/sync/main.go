package main

import (
	"context"
	"log"
	"os"
	"strconv"

	"github.com/aws/aws-lambda-go/lambda"

	"kronos/internal/config"
	"kronos/internal/leetcode"
	"kronos/internal/poller"
	"kronos/internal/store"
)

// run executes one sync+enrich pass. The DB pool, secrets, and season are
// resolved once at cold-start (in main) and reused across invocations so the
// per-minute cron doesn't re-decrypt SSM secrets (KMS) or reopen the pool.
func run(ctx context.Context, db *store.Postgres, session string, season int64) error {
	catalog, err := db.Catalog(ctx)
	if err != nil {
		return err
	}

	engine := &poller.Engine{
		Source:  leetcode.New(),
		Store:   db,
		Catalog: catalog,
		Season:  season,
	}

	members, err := db.DueMembers(ctx, 1000)
	if err != nil {
		return err
	}

	results := engine.SyncAll(ctx, members, 16)
	log.Printf("polled %d due members", len(results))

	enricher := &poller.Enricher{
		Detailer: leetcode.New(),
		Store:    db,
		Session:  session,
	}
	enriched, err := enricher.Run(ctx, 200)
	if err != nil {
		log.Printf("enrich pass error: %v", err)
		return nil
	}
	log.Printf("enriched %d submissions", enriched)
	return nil
}

func main() {
	ctx := context.Background()

	db, err := store.NewPostgres(ctx, config.Get(ctx, "DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}

	session := config.Get(ctx, "LEETCODE_SESSION")
	season, _ := strconv.ParseInt(os.Getenv("SEASON_START"), 10, 64)

	lambda.Start(func(ctx context.Context) error {
		return run(ctx, db, session, season)
	})
}
