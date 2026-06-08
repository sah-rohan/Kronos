package leetcode

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

const (
	endpoint  = "https://leetcode.com/graphql"
	userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"
)

type Client struct {
	http *http.Client
}

func New() *Client {
	return &Client{http: &http.Client{Timeout: 20 * time.Second}}
}

type AcceptedSubmission struct {
	ID        int64
	Slug      string
	Title     string
	Timestamp int64
}

type SubmissionDetail struct {
	Slug              string
	Language          string
	Code              string
	Runtime           int
	Memory            int
	RuntimePercentile float64
	MemoryPercentile  float64
}

func OptimalThreshold() float64 { return 72 }

func IsOptimal(runtimePercentile float64) bool {
	return runtimePercentile >= OptimalThreshold()
}

func (c *Client) query(ctx context.Context, session, query string, variables map[string]any, out any) error {
	payload, err := json.Marshal(map[string]any{"query": query, "variables": variables})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Referer", "https://leetcode.com")
	req.Header.Set("User-Agent", userAgent)
	if session != "" {
		req.Header.Set("Cookie", "LEETCODE_SESSION="+session)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("leetcode graphql status %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func (c *Client) AcceptedCount(ctx context.Context, username string) (int, error) {
	var out struct {
		Data struct {
			MatchedUser *struct {
				SubmitStatsGlobal struct {
					AcSubmissionNum []struct {
						Difficulty  string `json:"difficulty"`
						Submissions int    `json:"submissions"`
					} `json:"acSubmissionNum"`
				} `json:"submitStatsGlobal"`
			} `json:"matchedUser"`
		} `json:"data"`
	}
	const q = `query($u:String!){matchedUser(username:$u){submitStatsGlobal{acSubmissionNum{difficulty submissions}}}}`
	if err := c.query(ctx, "", q, map[string]any{"u": username}, &out); err != nil {
		return 0, err
	}
	if out.Data.MatchedUser == nil {
		return 0, fmt.Errorf("unknown leetcode user %q", username)
	}
	for _, n := range out.Data.MatchedUser.SubmitStatsGlobal.AcSubmissionNum {
		if n.Difficulty == "All" {
			return n.Submissions, nil
		}
	}
	return 0, nil
}

func (c *Client) RecentAccepted(ctx context.Context, username string, limit int) ([]AcceptedSubmission, error) {
	var out struct {
		Data struct {
			RecentAcSubmissionList []struct {
				ID        string `json:"id"`
				Slug      string `json:"titleSlug"`
				Title     string `json:"title"`
				Timestamp string `json:"timestamp"`
			} `json:"recentAcSubmissionList"`
		} `json:"data"`
	}
	const q = `query($u:String!,$l:Int){recentAcSubmissionList(username:$u,limit:$l){id titleSlug title timestamp}}`
	if err := c.query(ctx, "", q, map[string]any{"u": username, "l": limit}, &out); err != nil {
		return nil, err
	}
	submissions := make([]AcceptedSubmission, 0, len(out.Data.RecentAcSubmissionList))
	for _, s := range out.Data.RecentAcSubmissionList {
		id, _ := strconv.ParseInt(s.ID, 10, 64)
		ts, _ := strconv.ParseInt(s.Timestamp, 10, 64)
		submissions = append(submissions, AcceptedSubmission{ID: id, Slug: s.Slug, Title: s.Title, Timestamp: ts})
	}
	return submissions, nil
}

func (c *Client) SubmissionDetail(ctx context.Context, submissionID int64, session string) (*SubmissionDetail, error) {
	var out struct {
		Data struct {
			SubmissionDetails *struct {
				Runtime           int     `json:"runtime"`
				Memory            int     `json:"memory"`
				RuntimePercentile float64 `json:"runtimePercentile"`
				MemoryPercentile  float64 `json:"memoryPercentile"`
				Lang              struct {
					Name string `json:"name"`
				} `json:"lang"`
				Code     string `json:"code"`
				Question struct {
					Slug string `json:"titleSlug"`
				} `json:"question"`
			} `json:"submissionDetails"`
		} `json:"data"`
	}
	const q = `query($id:Int!){submissionDetails(submissionId:$id){runtime memory runtimePercentile memoryPercentile lang{name} code question{titleSlug}}}`
	if err := c.query(ctx, session, q, map[string]any{"id": submissionID}, &out); err != nil {
		return nil, err
	}
	d := out.Data.SubmissionDetails
	if d == nil {
		return nil, nil
	}
	return &SubmissionDetail{
		Slug:              d.Question.Slug,
		Language:          d.Lang.Name,
		Code:              d.Code,
		Runtime:           d.Runtime,
		Memory:            d.Memory,
		RuntimePercentile: d.RuntimePercentile,
		MemoryPercentile:  d.MemoryPercentile,
	}, nil
}
