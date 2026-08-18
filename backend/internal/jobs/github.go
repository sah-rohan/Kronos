package jobs

import (
	"context"
	"fmt"
	"io"
	"net/http"
)

// fetchReadme downloads one file's raw text from a public GitHub repo, using
// GitHub's REST "get repository content" endpoint. Passing the "raw" Accept
// header tells GitHub to hand back the file's plain text directly, instead
// of a JSON envelope with the content base64-encoded - one less decoding
// step for a beginner-friendly scraper.
//
// token is optional: an empty string still works, just at GitHub's lower
// unauthenticated rate limit (60 requests/hour per caller). These days the
// caller is the api Lambda's GET /jobs route, which fetches both files at
// most once every 5 minutes thanks to its in-memory cache - so a token
// isn't strictly required, but it's wired up (GITHUB_TOKEN_SSM, same
// pattern as LEETCODE_SESSION) to keep well clear of that limit.
func fetchReadme(ctx context.Context, token, owner, repo, ref, path string) (string, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s?ref=%s", owner, repo, path, ref)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	// GitHub rejects API requests that don't send a User-Agent.
	req.Header.Set("User-Agent", "kronos-job-board")
	req.Header.Set("Accept", "application/vnd.github.v3.raw")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github api %s/%s@%s/%s: %d %s", owner, repo, ref, path, resp.StatusCode, body)
	}
	return string(body), nil
}
