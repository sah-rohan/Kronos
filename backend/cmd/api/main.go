package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/lambda"
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

	handler := &api.API{Store: db, AdminClerkID: config.Get(ctx, "ADMIN_CLERK_ID")}
	lambda.Start(handler.Handle)
}
