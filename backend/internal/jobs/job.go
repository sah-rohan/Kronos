// Package jobs scrapes public new-grad/internship job lists out of two
// GitHub READMEs and turns them into a plain []Job slice.
//
// This feature has no server-side storage of any kind - no database table,
// no S3 object, no file on disk. The job data is derived from a public
// source rather than owned by us, so it can be re-fetched at any moment,
// which makes any copy we keep a cache rather than a record. The api
// Lambda's GET /jobs route (backend/internal/api/jobs.go) calls the
// fetchers here directly and caches the result in process memory; the
// browser caches its own page of that response in localStorage (see
// src/lib/jobsCache.ts). Those two layers are the whole caching story.
package jobs

import (
	"crypto/sha1"
	"encoding/hex"
)

// Job is one job posting scraped from a GitHub README table.
type Job struct {
	// ID is a short fingerprint identifying this posting - see newID for how
	// it's derived. It's deterministic (scraping the same posting twice
	// always produces the same ID) and canonicalized, so the same job
	// written differently in the two source READMEs still lands on one ID.
	// That lets Dedupe collapse cross-source duplicates, and lets a future
	// email-sync Lambda compute the same ID from a parsed email to find
	// "which dashboard job is this email about". See the TODO below.
	ID            string `json:"id"`
	Company       string `json:"company"`
	Position      string `json:"position"`
	Location      string `json:"location"`
	Salary        string `json:"salary,omitempty"`
	PostingURL    string `json:"postingUrl,omitempty"`
	Age           string `json:"age,omitempty"` // straight from the README, e.g. "3d", "1mo" - not parsed into a real duration
	Closed        bool   `json:"closed"`        // true when the README marks the application as closed
	SourceRepo    string `json:"sourceRepo"`    // e.g. "speedyapply/2027-SWE-College-Jobs"
	SourceSection string `json:"sourceSection"` // which table/heading it came from, e.g. "FAANG+", "Software Engineering"

	// TODO(email-sync): the email-sync Lambda (backend/cmd/emailsync) will
	// eventually look a job up by ID and attach fields like these:
	//   OAStatus          string `json:"oaStatus,omitempty"`          // "", "OA_RECEIVED", "INTERVIEW_SCHEDULED", "REJECTED"
	//   OAStatusUpdatedAt string `json:"oaStatusUpdatedAt,omitempty"`
	// Nothing sets those yet - this is just marking where they'd go so the
	// two features can meet in the middle later.
}

// newID builds the fingerprint that decides whether two scraped rows are the
// same posting. Hashing (instead of concatenating the fields raw) keeps the
// ID short and free of characters that would need escaping in a URL or JSON
// key.
//
// There are two identity schemes, tried in order:
//
//  1. The canonical posting URL, when there is one. Both READMEs link to the
//     employer's real applicant-tracking page (Greenhouse, Lever, Workday),
//     and when the same job appears in both they almost always point at the
//     identical link. Identifying by URL therefore sidesteps the hardest
//     problem entirely - two repos wording the same role differently still
//     collapse to one ID, with no fuzzy title matching anywhere.
//
//  2. Company + position + location, when the posting has no link at all.
//     SimplifyJobs renders a closed application as a lock emoji with no
//     href, so this path is mostly closed listings. Location is part of the
//     key because without it every closed role sharing a company and title
//     merges into one entry regardless of city, hiding real openings.
//
// The two schemes are namespaced ("u|" vs "cpl|") so a canonical URL can
// never collide with a company/position/location triple.
//
// Known limitation: a posting with a link and the same posting without one
// produce different IDs and will not merge. That's under-merging - the job
// shows up twice - which is the deliberate direction to fail in, since
// over-merging would make a real posting disappear.
func newID(company, position, location, postingURL string) string {
	if u := canonicalURL(postingURL); u != "" {
		return hashKey("u|" + u)
	}
	return hashKey("cpl|" +
		canonicalCompany(company) + "|" +
		canonicalPosition(position) + "|" +
		canonicalLocation(location))
}

// hashKey reduces an identity key to 16 hex characters. Truncating SHA-1
// this way is fine here: the risk is an accidental collision between two
// real postings, not an adversary engineering one, and 64 bits is far more
// than enough for a few thousand rows.
func hashKey(key string) string {
	sum := sha1.Sum([]byte(key))
	return hex.EncodeToString(sum[:])[:16]
}
