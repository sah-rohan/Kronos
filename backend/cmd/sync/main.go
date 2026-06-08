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

func handler(ctx context.Context) error {
	db, err := store.NewPostgres(ctx, config.Get(ctx, "DATABASE_URL"))
	if err != nil {
		return err
	}
	defer db.Close()

	catalog, err := db.Catalog(ctx)
	if err != nil {
		return err
	}

	season, _ := strconv.ParseInt(os.Getenv("SEASON_START"), 10, 64)

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
		Session:  config.Get(ctx, "LEETCODE_SESSION"),
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
	lambda.Start(handler)
}
