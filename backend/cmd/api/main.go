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
		LeetCodeSess: func(ctx context.Context) string { return config.Get(ctx, "LEETCODE_SESSION") },

		AzureEndpoint:   config.Get(ctx, "AZURE_OPENAI_ENDPOINT"),
		AzureDeployment: config.Get(ctx, "AZURE_OPENAI_DEPLOYMENT"),
		AzureKey:        config.Get(ctx, "AZURE_OPENAI_KEY"),
		AzureEffort:     config.Get(ctx, "AZURE_OPENAI_EFFORT"),

		GraderDeployment: config.Get(ctx, "AZURE_OPENAI_GRADER_DEPLOYMENT"),
		GraderEffort:     config.Get(ctx, "AZURE_OPENAI_GRADER_EFFORT"),
		GradeQueueURL:    config.Get(ctx, "GRADE_QUEUE_URL"),
	})
	lambda.Start(handler.Handle)
}
