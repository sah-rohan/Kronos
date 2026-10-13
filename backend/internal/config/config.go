package config

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	ssmtypes "github.com/aws/aws-sdk-go-v2/service/ssm/types"
)

var (
	once   sync.Once
	client *ssm.Client
	cache  sync.Map // resolved key -> cached, so a warm container rarely decrypts
)

// ttl bounds how stale a secret can be: a value rotated in SSM reaches every
// warm container within this window, with no redeploy.
const ttl = 5 * time.Minute

type cached struct {
	value string
	at    time.Time
}

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
	prev, hit := cache.Load(key)
	if hit && time.Since(prev.(cached).at) < ttl {
		return prev.(cached).value
	}
	// On a failed refresh, keep serving the last value rather than nothing.
	stale := ""
	if hit {
		stale = prev.(cached).value
	}
	name := os.Getenv(key + "_SSM")
	if name == "" {
		return ""
	}
	c := ssmClient(ctx)
	if c == nil {
		return stale
	}
	out, err := c.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(name),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		return stale
	}
	val := aws.ToString(out.Parameter.Value)
	cache.Store(key, cached{val, time.Now()})
	return val
}

// Put writes a secret to its SSM SecureString parameter ({key}_SSM) and refreshes
// the in-process cache. Used by the admin UI to rotate the LeetCode session token
// without a redeploy. Secrets live only in SSM SecureString - never in the DB.
func Put(ctx context.Context, key, value string) error {
	name := os.Getenv(key + "_SSM")
	if name == "" {
		return fmt.Errorf("no SSM parameter configured for %s", key)
	}
	c := ssmClient(ctx)
	if c == nil {
		return fmt.Errorf("ssm client unavailable")
	}
	_, err := c.PutParameter(ctx, &ssm.PutParameterInput{
		Name:      aws.String(name),
		Value:     aws.String(value),
		Type:      ssmtypes.ParameterTypeSecureString,
		Overwrite: aws.Bool(true),
	})
	if err != nil {
		return err
	}
	cache.Store(key, cached{value, time.Now()})
	return nil
}
