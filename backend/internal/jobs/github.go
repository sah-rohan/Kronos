package jobs

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

const githubRawBase = "https://api.github.com/repos/%s/%sreadme"

type GitHubClient struct {
	http *http.GitHubClient
	token string
}

func NewGitHubClient(token string) *GitHubClient {
    return &GitHubClient{
        http:  &http.Client{Timeout: 15 * time.Second},
        token: token,
    }
}

// FetchREADME returns the raw markdown content of a repo's README.
func (c *GitHubClient) FetchREADME(ctx context.Context, owner, repo string) (string, error) {
    url := fmt.Sprintf(githubRawBase, owner, repo)
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return "", err
    }
    // Ask for raw markdown directly — avoids base64 decoding the default response.
    req.Header.Set("Accept", "application/vnd.github.raw+json")
    req.Header.Set("User-Agent", "kronos-job-scraper/1.0")
    if c.token != "" {
        req.Header.Set("Authorization", "Bearer "+c.token)
    }
    resp, err := c.http.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("github readme fetch: status %d for %s/%s", resp.StatusCode, owner, repo)
    }
    body, err := io.ReadAll(resp.Body)
    return string(body), err
}