package main

import (
	"context"
	"log"
	"strconv"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/clerk/clerk-sdk-go/v2"

	"kronos/internal/api"
	"kronos/internal/config"
	"kronos/internal/platform/db"
)

func main() {
	ctx := context.Background()

	clerk.SetKey(config.Get(ctx, "CLERK_SECRET_KEY"))

	pool, err := db.Open(ctx, config.Get(ctx, "DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}

	season, _ := strconv.ParseInt(config.Get(ctx, "SEASON_START"), 10, 64)

	handler := api.New(pool, api.Config{
		AdminClerkID: config.Get(ctx, "ADMIN_CLERK_ID"),
		Season:       season,
		LeetCodeSess: config.Get(ctx, "LEETCODE_SESSION"),
	})
	lambda.Start(handler.Handle)
}
