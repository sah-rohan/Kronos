package main

import (
	"context"
	"errors"
	"log"

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

	enricher := &poller.Enricher{
		Detailer: leetcode.New(),
		Store:    db,
		Session:  config.Get(ctx, "LEETCODE_SESSION"),
	}

	enriched, err := enricher.Run(ctx, 200)
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
