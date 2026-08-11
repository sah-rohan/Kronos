package jobs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// WriteCache serializes payload as JSON and uploads it to bucket/key,
// overwriting whatever was there before. Called once per scheduled jobsync
// run (every minute) - this is the only place anything writes to the cache.
func WriteCache(ctx context.Context, client *s3.Client, bucket, key string, payload CachePayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(body),
		ContentType: aws.String("application/json"),
	})
	return err
}

// ReadCache downloads and parses the cached jobs JSON. If the object doesn't
// exist yet - e.g. right after a fresh deploy, before jobsync's first
// scheduled run - it returns an empty payload instead of an error, so a
// dashboard load gets "no jobs yet" rather than a 500.
func ReadCache(ctx context.Context, client *s3.Client, bucket, key string) (CachePayload, error) {
	out, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		var noSuchKey *types.NoSuchKey
		if errors.As(err, &noSuchKey) {
			return CachePayload{}, nil
		}
		return CachePayload{}, err
	}
	defer out.Body.Close()

	body, err := io.ReadAll(out.Body)
	if err != nil {
		return CachePayload{}, err
	}

	var payload CachePayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return CachePayload{}, err
	}
	return payload, nil
}
