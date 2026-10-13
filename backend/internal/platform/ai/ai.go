// Package ai is the Azure OpenAI client the rest of the backend talks through.
// It knows one endpoint - the v1 Responses API - and nothing about resumes,
// problems, or prompts; the feature that calls it owns all of that.
//
// Authentication is delegated to forge, which resolves a managed identity, an
// az login, or a key, and refreshes it in the background. Nothing here ever
// sees a credential.
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	forge "github.com/sah-rohan/forge/go"
)

// requestTimeout bounds a completion whose caller set no deadline of its own.
const requestTimeout = 90 * time.Second

// Role values the Responses API accepts. "developer" is the gpt-5 family's
// system role.
const (
	RoleDeveloper = "developer"
	RoleUser      = "user"
	RoleAssistant = "assistant"
)

// Message is one turn of a conversation.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Client is a configured deployment. One per process; safe for concurrent use.
type Client struct {
	http     *http.Client
	endpoint string // https://<resource>.openai.azure.com
	model    string // the Azure deployment name, e.g. "balanced"
	effort   string // reasoning effort: "low" | "medium" | "high"
}

// New configures a client against one deployment. key may be empty, in which
// case forge falls back to a managed identity or the caller's az login.
func New(endpoint, deployment, key, effort string) *Client {
	cred := forge.Default()
	if key != "" {
		cred = forge.StaticKey(key)
	}
	if effort == "" {
		effort = "medium"
	}
	return &Client{
		http:     &http.Client{Transport: forge.Transport(cred, nil)},
		endpoint: strings.TrimSuffix(endpoint, "/"),
		model:    deployment,
		effort:   effort,
	}
}

// Configured reports whether the deployment was wired at startup. When it is
// not, features that depend on it answer 503 instead of failing mid-request.
func (c *Client) Configured() bool {
	return c != nil && c.endpoint != "" && c.model != ""
}

type request struct {
	Model     string    `json:"model"`
	Input     []Message `json:"input"`
	MaxTokens int       `json:"max_output_tokens,omitempty"`
	Reasoning reasoning `json:"reasoning"`
	Text      *text     `json:"text,omitempty"`
}

type text struct {
	Format format `json:"format"`
}

type format struct {
	Type   string `json:"type"`
	Name   string `json:"name"`
	Schema any    `json:"schema"`
	Strict bool   `json:"strict"`
}

type reasoning struct {
	Effort string `json:"effort"`
}

type response struct {
	Status string `json:"status"`
	Output []struct {
		Type    string `json:"type"`
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	} `json:"output"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
	IncompleteDetails *struct {
		Reason string `json:"reason"`
	} `json:"incomplete_details"`
}

// Respond sends one conversation and returns the assistant's text. maxTokens
// caps the reply (reasoning tokens included), so the caller decides how much
// of its budget a single answer may spend.
func (c *Client) Respond(ctx context.Context, msgs []Message, maxTokens int) (string, error) {
	return c.send(ctx, request{Input: msgs, MaxTokens: maxTokens})
}

// RespondJSON constrains the reply to a strict JSON schema and decodes it into out.
func (c *Client) RespondJSON(ctx context.Context, msgs []Message, name string, schema any, maxTokens int, out any) error {
	raw, err := c.send(ctx, request{
		Input:     msgs,
		MaxTokens: maxTokens,
		Text:      &text{Format: format{Type: "json_schema", Name: name, Schema: schema, Strict: true}},
	})
	if err != nil {
		return err
	}
	if err := json.Unmarshal([]byte(raw), out); err != nil {
		return fmt.Errorf("ai: decode %s: %w", name, err)
	}
	return nil
}

func (c *Client) send(ctx context.Context, r request) (string, error) {
	if !c.Configured() {
		return "", fmt.Errorf("ai: no deployment configured")
	}
	if _, ok := ctx.Deadline(); !ok {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, requestTimeout)
		defer cancel()
	}

	r.Model = c.model
	r.Reasoning = reasoning{Effort: c.effort}
	body, err := json.Marshal(r)
	if err != nil {
		return "", err
	}

	url := c.endpoint + "/openai/v1/responses?api-version=preview"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("ai: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", fmt.Errorf("ai: read response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ai: azure returned %d: %s", resp.StatusCode, snippet(raw))
	}

	var out response
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("ai: decode response: %w", err)
	}
	if out.Error != nil && out.Error.Message != "" {
		return "", fmt.Errorf("ai: %s", out.Error.Message)
	}

	text := outputText(out)
	if text == "" {
		// A gpt-5 model that spends its whole budget reasoning returns
		// status "incomplete" with no message block.
		reason := "no message in response"
		if out.IncompleteDetails != nil && out.IncompleteDetails.Reason != "" {
			reason = out.IncompleteDetails.Reason
		}
		return "", fmt.Errorf("ai: empty reply (%s)", reason)
	}
	return text, nil
}

// outputText concatenates the text of every message block, skipping the
// reasoning blocks the model emits alongside them.
func outputText(r response) string {
	var b strings.Builder
	for _, item := range r.Output {
		if item.Type != "message" {
			continue
		}
		for _, part := range item.Content {
			if part.Type == "output_text" {
				b.WriteString(part.Text)
			}
		}
	}
	return strings.TrimSpace(b.String())
}

func snippet(raw []byte) string {
	s := strings.TrimSpace(string(raw))
	if len(s) > 300 {
		return s[:300] + "…"
	}
	return s
}
