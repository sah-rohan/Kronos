package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	forge "github.com/sah-rohan/forge/go"
)

const (
	defaultDeployment = "fast"
	defaultAPIVersion = "2024-10-21"
	maxDesignBytes    = 32 * 1024
	requestTimeout    = 60 * time.Second
)

var (
	ErrDisabled = errors.New("ai is not configured")
	ErrBadInput = errors.New("bad design payload")
)

const reviewSystem = `You review system design submissions for a study group.
Be direct and specific. Name what is missing or wrong before what is good.
Keep it under 200 words, in short paragraphs, no headings.`

type Config struct {
	Endpoint   string
	Deployment string
	APIVersion string

	// HTTPClient replaces the credentialed client, for tracing or tests.
	HTTPClient *http.Client
}

type Service struct {
	cfg    Config
	client *http.Client
}

func NewService(cfg Config) *Service {
	cfg.Endpoint = strings.TrimRight(strings.TrimSpace(cfg.Endpoint), "/")
	if cfg.Deployment == "" {
		cfg.Deployment = defaultDeployment
	}
	if cfg.APIVersion == "" {
		cfg.APIVersion = defaultAPIVersion
	}

	client := cfg.HTTPClient
	if client == nil {
		// One credential per process, so a warm Lambda fetches one token an hour.
		client = forge.Client(forge.Default())
		client.Timeout = requestTimeout
	}

	return &Service{cfg: cfg, client: client}
}

func (s *Service) Enabled() bool { return s.cfg.Endpoint != "" }

func (s *Service) ReviewDesign(ctx context.Context, slug, design string) (*Review, error) {
	design = strings.TrimSpace(design)
	if design == "" || len(design) > maxDesignBytes {
		return nil, ErrBadInput
	}

	prompt := fmt.Sprintf("Problem: %s\n\nThe candidate's design as JSON:\n%s", slug, design)
	text, usage, err := s.complete(ctx, reviewSystem, prompt)
	if err != nil {
		return nil, err
	}

	return &Review{
		Slug:       slug,
		Text:       text,
		Deployment: s.cfg.Deployment,
		Tokens:     usage,
	}, nil
}

func (s *Service) Ask(ctx context.Context, prompt string) (string, error) {
	text, _, err := s.complete(ctx, "", prompt)
	return text, err
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message message `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func (s *Service) complete(ctx context.Context, system, prompt string) (string, Tokens, error) {
	if !s.Enabled() {
		return "", Tokens{}, ErrDisabled
	}

	messages := make([]message, 0, 2)
	if system != "" {
		messages = append(messages, message{Role: "system", Content: system})
	}
	messages = append(messages, message{Role: "user", Content: prompt})

	body, err := json.Marshal(map[string]any{"messages": messages})
	if err != nil {
		return "", Tokens{}, err
	}

	url := fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=%s",
		s.cfg.Endpoint, s.cfg.Deployment, s.cfg.APIVersion)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", Tokens{}, err
	}
	req.Header.Set("content-type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", Tokens{}, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", Tokens{}, err
	}

	var out chatResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", Tokens{}, fmt.Errorf("azure %d: %s", resp.StatusCode, clip(string(raw)))
	}
	if resp.StatusCode != http.StatusOK {
		return "", Tokens{}, fmt.Errorf("azure %d [%s] %s", resp.StatusCode, out.Error.Code, out.Error.Message)
	}
	if len(out.Choices) == 0 {
		return "", Tokens{}, fmt.Errorf("azure returned no choices")
	}

	return strings.TrimSpace(out.Choices[0].Message.Content),
		Tokens{In: out.Usage.PromptTokens, Out: out.Usage.CompletionTokens}, nil
}

func clip(s string) string {
	if len(s) > 300 {
		return s[:300] + "…"
	}
	return s
}
