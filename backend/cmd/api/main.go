package main

import (
	"context"
	"log"
	"strconv"

	"github.com/aws/aws-lambda-go/lambda"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/clerk/clerk-sdk-go/v2"

	"kronos/internal/api"
	"kronos/internal/config"
	"kronos/internal/store"
)

func main() {
	ctx := context.Background()

	clerk.SetKey(config.Get(ctx, "CLERK_SECRET_KEY"))

	db, err := store.NewPostgres(ctx, config.Get(ctx, "DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}

	season, _ := strconv.ParseInt(config.Get(ctx, "SEASON_START"), 10, 64)

	awsCfg, err := awscfg.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatal(err)
	}

	handler := &api.API{
		Store:        db,
		AdminClerkID: config.Get(ctx, "ADMIN_CLERK_ID"),
		Season:       season,
		Session:      config.Get(ctx, "LEETCODE_SESSION"),
		S3:           s3.NewFromConfig(awsCfg),
		JobsBucket:   config.Get(ctx, "JOBS_BUCKET"),
		JobsKey:      config.Get(ctx, "JOBS_KEY"),
	}
	lambda.Start(handler.Handle)
}
