package jobs

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-sdk-go-v2/aws"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

const TypeInterview = "interview"

// Job is one message on the grade queue. An empty Type is an interview.
type Job struct {
	Type string `json:"type,omitempty"`
	ID   string `json:"id"`
}

type Queue interface {
	Enqueue(ctx context.Context, id string) error
}

// Func runs the job in-process, for local runs with no queue.
type Func func(ctx context.Context, id string) error

func (f Func) Enqueue(ctx context.Context, id string) error { return f(ctx, id) }

type sqsQueue struct {
	client *sqs.Client
	url    string
	typ    string
}

func NewSQS(ctx context.Context, url, typ string) (Queue, error) {
	cfg, err := awscfg.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &sqsQueue{client: sqs.NewFromConfig(cfg), url: url, typ: typ}, nil
}

func (q *sqsQueue) Enqueue(ctx context.Context, id string) error {
	body, err := json.Marshal(Job{Type: q.typ, ID: id})
	if err != nil {
		return err
	}
	_, err = q.client.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    aws.String(q.url),
		MessageBody: aws.String(string(body)),
	})
	return err
}
