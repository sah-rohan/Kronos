package config

import (
	"context"
	"os"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
)

var (
	once   sync.Once
	client *ssm.Client
	cache  sync.Map // resolved key -> value, so each secret is decrypted once per container
)

func ssmClient(ctx context.Context) *ssm.Client {
	once.Do(func() {
		cfg, err := awscfg.LoadDefaultConfig(ctx)
		if err == nil {
			client = ssm.NewFromConfig(cfg)
		}
	})
	return client
}

func Get(ctx context.Context, key string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	// Cache decrypted secrets per warm container to avoid a KMS Decrypt on every
	// call (the sync Lambda runs once a minute).
	if v, ok := cache.Load(key); ok {
		return v.(string)
	}
	name := os.Getenv(key + "_SSM")
	if name == "" {
		return ""
	}
	c := ssmClient(ctx)
	if c == nil {
		return ""
	}
	out, err := c.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(name),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		return ""
	}
	val := aws.ToString(out.Parameter.Value)
	cache.Store(key, val)
	return val
}
