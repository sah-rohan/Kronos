package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"kronos/internal/platform/httpx"
)

func stub(t *testing.T, status int, body string) *Service {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		w.WriteHeader(status)
		fmt.Fprint(w, body)
	}))
	t.Cleanup(srv.Close)

	return NewService(Config{Endpoint: srv.URL, HTTPClient: srv.Client()})
}

const okBody = `{"choices":[{"message":{"content":"  needs a cache  "}}],"usage":{"prompt_tokens":12,"completion_tokens":34}}`

func TestReviewDesign(t *testing.T) {
	svc := stub(t, 200, okBody)

	review, err := svc.ReviewDesign(context.Background(), "url-shortener", `{"nodes":[]}`)
	if err != nil {
		t.Fatalf("review: %v", err)
	}
	if review.Text != "needs a cache" {
		t.Errorf("text = %q", review.Text)
	}
	if review.Slug != "url-shortener" || review.Deployment != defaultDeployment {
		t.Errorf("slug/deployment = %q/%q", review.Slug, review.Deployment)
	}
	if review.Tokens.In != 12 || review.Tokens.Out != 34 {
		t.Errorf("tokens = %+v", review.Tokens)
	}
}

func TestReviewDesignRejectsBadInput(t *testing.T) {
	svc := stub(t, 200, okBody)

	for name, design := range map[string]string{
		"empty":     "   ",
		"oversized": strings.Repeat("x", maxDesignBytes+1),
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := svc.ReviewDesign(context.Background(), "s", design); !errors.Is(err, ErrBadInput) {
				t.Fatalf("err = %v, want ErrBadInput", err)
			}
		})
	}
}

func TestDisabledWithoutAnEndpoint(t *testing.T) {
	svc := NewService(Config{})
	if svc.Enabled() {
		t.Fatal("a service with no endpoint must not report enabled")
	}
	if _, err := svc.ReviewDesign(context.Background(), "s", `{}`); !errors.Is(err, ErrDisabled) {
		t.Fatalf("err = %v, want ErrDisabled", err)
	}
}

func TestAzureErrorIsSurfaced(t *testing.T) {
	svc := stub(t, 429, `{"error":{"code":"429","message":"rate limited"}}`)

	_, err := svc.ReviewDesign(context.Background(), "s", `{}`)
	if err == nil || !strings.Contains(err.Error(), "rate limited") {
		t.Fatalf("err = %v, want the azure message", err)
	}
}

func TestSendsSystemPromptAndDesign(t *testing.T) {
	var got struct {
		Messages []message `json:"messages"`
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.Header().Set("content-type", "application/json")
		fmt.Fprint(w, okBody)
	}))
	t.Cleanup(srv.Close)

	svc := NewService(Config{Endpoint: srv.URL, HTTPClient: srv.Client()})
	if _, err := svc.ReviewDesign(context.Background(), "rate-limiter", `{"nodes":[1]}`); err != nil {
		t.Fatal(err)
	}

	if len(got.Messages) != 2 {
		t.Fatalf("sent %d messages, want a system and a user turn", len(got.Messages))
	}
	if got.Messages[0].Role != "system" || !strings.Contains(got.Messages[0].Content, "system design") {
		t.Errorf("system turn = %+v", got.Messages[0])
	}
	if !strings.Contains(got.Messages[1].Content, "rate-limiter") ||
		!strings.Contains(got.Messages[1].Content, `{"nodes":[1]}`) {
		t.Errorf("user turn = %q", got.Messages[1].Content)
	}
}

func TestControllerRoutes(t *testing.T) {
	svc := stub(t, 200, okBody)
	c := NewController(svc)

	t.Run("claims the review route", func(t *testing.T) {
		resp, handled, err := c.Route(&httpx.Request{
			Method: "POST",
			Path:   "/me/sd/url-shortener/review",
			Parts:  []string{"me", "sd", "url-shortener", "review"},
			Body:   `{"design":{"nodes":[]}}`,
		})
		if err != nil || !handled {
			t.Fatalf("handled=%v err=%v", handled, err)
		}
		if resp.StatusCode != 200 || !strings.Contains(resp.Body, "needs a cache") {
			t.Fatalf("resp = %d %s", resp.StatusCode, resp.Body)
		}
	})

	t.Run("passes on anything else", func(t *testing.T) {
		_, handled, _ := c.Route(&httpx.Request{
			Method: "POST",
			Path:   "/me/sd/url-shortener",
			Parts:  []string{"me", "sd", "url-shortener"},
		})
		if handled {
			t.Fatal("the ai controller must not claim the solve route")
		}
	})

	t.Run("rejects an empty design", func(t *testing.T) {
		resp, handled, _ := c.Route(&httpx.Request{
			Method: "POST",
			Path:   "/me/sd/s/review",
			Parts:  []string{"me", "sd", "s", "review"},
			Body:   `{}`,
		})
		if !handled || resp.StatusCode != 400 {
			t.Fatalf("resp = %d", resp.StatusCode)
		}
	})
}

func TestControllerReports503WhenUnconfigured(t *testing.T) {
	c := NewController(NewService(Config{}))

	resp, handled, _ := c.Route(&httpx.Request{
		Method: "POST",
		Path:   "/me/sd/s/review",
		Parts:  []string{"me", "sd", "s", "review"},
		Body:   `{"design":{"a":1}}`,
	})
	if !handled || resp.StatusCode != 503 {
		t.Fatalf("resp = %d, want 503 when AZURE_OPENAI_ENDPOINT is unset", resp.StatusCode)
	}
}

// Runs against the real deployment when AZURE_OPENAI_ENDPOINT is set.
func TestReviewDesignLive(t *testing.T) {
	endpoint := os.Getenv("AZURE_OPENAI_ENDPOINT")
	if endpoint == "" {
		t.Skip("AZURE_OPENAI_ENDPOINT not set")
	}

	svc := NewService(Config{Endpoint: endpoint, Deployment: os.Getenv("AZURE_OPENAI_DEPLOYMENT")})
	review, err := svc.ReviewDesign(context.Background(), "url-shortener",
		`{"nodes":[{"type":"client"},{"type":"api"},{"type":"database"}],"edges":[[0,1],[1,2]]}`)
	if err != nil {
		t.Fatalf("live review: %v", err)
	}
	if review.Text == "" {
		t.Fatal("empty review")
	}
	t.Logf("%d in / %d out\n%s", review.Tokens.In, review.Tokens.Out, review.Text)
}
