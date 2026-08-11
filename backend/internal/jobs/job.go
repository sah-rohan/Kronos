// Package jobs scrapes public new-grad/internship job lists out of two
// GitHub READMEs and turns them into a plain []Job slice. There is no
// database involved anywhere in this feature: backend/cmd/jobsync (a
// scheduled Lambda) calls this package, then writes the result as one JSON
// file to S3 (see cache.go) as a refresh-every-minute cache. The api
// Lambda's GET /jobs route reads that same file - it never talks to GitHub.
package jobs

import (
	"crypto/sha1"
	"encoding/hex"
	"strings"
	"time"
)

// Job is one job posting scraped from a GitHub README table.
type Job struct {
	// ID is a short fingerprint of (Company, Position, PostingURL). It's
	// deterministic - scraping the same posting twice always produces the
	// same ID - so a future email-sync Lambda can compute this same ID from
	// a parsed email (once it knows the company/role/link) and use it to
	// find "which dashboard job is this email about". See the TODO below.
	ID            string `json:"id"`
	Company       string `json:"company"`
	Position      string `json:"position"`
	Location      string `json:"location"`
	Salary        string `json:"salary,omitempty"`
	PostingURL    string `json:"postingUrl,omitempty"`
	Age           string `json:"age,omitempty"` // straight from the README, e.g. "3d", "1mo" - not parsed into a real duration
	Closed        bool   `json:"closed"`         // true when the README marks the application as closed
	SourceRepo    string `json:"sourceRepo"`     // e.g. "speedyapply/2027-SWE-College-Jobs"
	SourceSection string `json:"sourceSection"`  // which table/heading it came from, e.g. "FAANG+", "Software Engineering"

	// TODO(email-sync): the email-sync Lambda (backend/cmd/emailsync) will
	// eventually look a job up by ID and attach fields like these:
	//   OAStatus          string `json:"oaStatus,omitempty"`          // "", "OA_RECEIVED", "INTERVIEW_SCHEDULED", "REJECTED"
	//   OAStatusUpdatedAt string `json:"oaStatusUpdatedAt,omitempty"`
	// Nothing sets those yet - this is just marking where they'd go so the
	// two features can meet in the middle later.
}

// newID hashes the three fields that together identify a specific posting.
// Hashing (instead of e.g. concatenating them raw) keeps the ID short and
// free of characters that would need escaping in a URL or JSON key.
func newID(company, position, postingURL string) string {
	key := strings.ToLower(strings.TrimSpace(company)) + "|" +
		strings.ToLower(strings.TrimSpace(position)) + "|" +
		strings.ToLower(strings.TrimSpace(postingURL))
	sum := sha1.Sum([]byte(key))
	return hex.EncodeToString(sum[:])[:16]
}

// CachePayload is the JSON document jobsync writes to S3 and the api Lambda
// reads back out. ScrapedAt lets the api Lambda tell "no jobs yet" (the zero
// time) apart from "scraped, list happened to be empty," and lets the
// frontend show "updated N minutes ago" if we want that later.
type CachePayload struct {
	ScrapedAt time.Time `json:"scrapedAt"`
	Jobs      []Job     `json:"jobs"`
}
