package main

import (
	"context"
	"errors"
	"log"

	"github.com/aws/aws-lambda-go/lambda"

	"kronos/internal/config"
	"kronos/internal/platform/db"
	"kronos/internal/poller"
	"kronos/internal/syncing"
)

func handler(ctx context.Context) error {
	pool, err := db.Open(ctx, config.Get(ctx, "DATABASE_URL"))
	if err != nil {
		return err
	}
	defer pool.Close()

	svc := syncing.NewService(syncing.NewRepo(pool), config.Get(ctx, "LEETCODE_SESSION"), 0)

	enriched, err := svc.Enrich(ctx)
	if errors.Is(err, poller.ErrSessionExpired) {
		log.Println("leetcode session expired: refresh required")
		return err
	}
	if err != nil {
		return err
	}

	log.Printf("enriched %d submissions", enriched)
	return nil
}

func main() {
	lambda.Start(handler)
}
