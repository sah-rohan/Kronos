package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"kronos/internal/api"
	"kronos/internal/career"
	"kronos/internal/config"
	"kronos/internal/interview"
	"kronos/internal/platform/db"
	"kronos/internal/platform/jobs"
)

var graders map[string]func(context.Context, string) error

// handler grades each queued job. A failed message is reported back so SQS
// retries only that one, and moves it to the dead-letter queue after the last attempt.
func handler(ctx context.Context, ev events.SQSEvent) (events.SQSEventResponse, error) {
	var resp events.SQSEventResponse
	for _, m := range ev.Records {
		var j jobs.Job
		if err := json.Unmarshal([]byte(m.Body), &j); err != nil || j.ID == "" {
			log.Printf("grade: dropping malformed message %s", m.MessageId)
			continue
		}
		if j.Type == "" {
			j.Type = jobs.TypeInterview
		}
		grade, ok := graders[j.Type]
		if !ok {
			log.Printf("grade: dropping unknown type %q", j.Type)
			continue
		}
		if err := grade(ctx, j.ID); err != nil {
			log.Printf("grade %s %s: %v", j.Type, j.ID, err)
			resp.BatchItemFailures = append(resp.BatchItemFailures, events.SQSBatchItemFailure{ItemIdentifier: m.MessageId})
			continue
		}
		log.Printf("graded %s %s", j.Type, j.ID)
	}
	return resp, nil
}

func main() {
	ctx := context.Background()
	pool, err := db.Open(ctx, config.Get(ctx, "DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	cfg := api.Config{
		AzureEndpoint:    config.Get(ctx, "AZURE_OPENAI_ENDPOINT"),
		AzureDeployment:  config.Get(ctx, "AZURE_OPENAI_DEPLOYMENT"),
		AzureKey:         config.Get(ctx, "AZURE_OPENAI_KEY"),
		GraderDeployment: config.Get(ctx, "AZURE_OPENAI_GRADER_DEPLOYMENT"),
		GraderEffort:     config.Get(ctx, "AZURE_OPENAI_GRADER_EFFORT"),
	}
	graders = map[string]func(context.Context, string) error{
		jobs.TypeInterview: api.NewInterviews(interview.NewRepo(pool), career.NewRepo(pool), cfg).Grade,
	}
	lambda.Start(handler)
}
