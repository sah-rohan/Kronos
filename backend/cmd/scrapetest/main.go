// scrapetest is a manual, local-only debug tool - NOT a deployed Lambda.
// It is not built by backend/build.sh and not referenced anywhere in
// terraform, so running it never touches AWS or Postgres. All it does is
// call the same two functions GET /jobs calls (jobs.FetchSpeedyApplyJobs and
// jobs.FetchSimplifyJobsNewGrad) and print what they found, so you can check
// the GitHub scraping + Markdown/HTML parsing actually works before wiring
// up anything else.
//
// Run it from the backend/ directory with:
//
//	go run ./cmd/scrapetest
package main

import (
	"context"
	"fmt"
	"os"

	"kronos/internal/jobs"
)

// sample prints the first n jobs from a slice (or all of them if there are
// fewer than n) so the terminal output stays readable even though a real
// scrape can return hundreds of rows.
func sample(label string, all []jobs.Job, n int) {
	fmt.Printf("\n=== %s: %d jobs found ===\n", label, len(all))
	for i, j := range all {
		if i >= n {
			fmt.Printf("... and %d more\n", len(all)-n)
			break
		}
		closed := ""
		if j.Closed {
			closed = " [CLOSED]"
		}
		link := j.PostingURL
		if link == "" {
			link = "(no link)" // e.g. a closed SimplifyJobs row - its Application cell is just a 🔒 emoji
		}
		fmt.Printf("%2d. %-22s %-45s %-20s age=%-6s %-22s%s\n    -> %s\n",
			i+1, truncate(j.Company, 22), truncate(j.Position, 45), truncate(j.Location, 20), j.Age, j.SourceSection, closed, link)
	}
}

// truncate is rune-aware (not byte-aware) since company names sometimes
// contain emoji, e.g. "🔥 TikTok" - slicing by byte could cut a multi-byte
// character in half and print garbage.
func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n-1]) + "…"
}

func main() {
	ctx := context.Background()
	// Optional: set GITHUB_TOKEN in your shell first if you hit GitHub's
	// unauthenticated rate limit (unlikely for a single manual run).
	token := os.Getenv("GITHUB_TOKEN")

	speedyJobs, err := jobs.FetchSpeedyApplyJobs(ctx, token)
	if err != nil {
		fmt.Println("speedyapply error:", err)
	}
	sample("SpeedyApply (speedyapply/2027-SWE-College-Jobs)", speedyJobs, 8)

	simplifyJobs, err := jobs.FetchSimplifyJobsNewGrad(ctx, token)
	if err != nil {
		fmt.Println("simplifyjobs error:", err)
	}
	sample("SimplifyJobs (SimplifyJobs/New-Grad-Positions)", simplifyJobs, 8)

	fmt.Printf("\nTotal: %d jobs scraped\n", len(speedyJobs)+len(simplifyJobs))
}
