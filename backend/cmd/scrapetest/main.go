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
	"strings"

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

	combined := append(speedyJobs, simplifyJobs...)
	fmt.Printf("\nTotal: %d jobs scraped\n", len(combined))

	// Lookalikes are measured on the deduped list on purpose: it's the list a
	// user actually sees, so the count reflects duplication still visible in
	// the dashboard rather than duplication the rules already handled.
	reportLookalikes(reportDedupe(combined, 12), 12)
}

// reportLookalikes finds rows a human would call duplicates - same company,
// title and location - that URL-first identity deliberately keeps apart
// because their posting links genuinely differ. This is the other half of the
// picture: reportDedupe says what the rules DID merge, this says what a user
// would still see listed twice.
func reportLookalikes(all []jobs.Job, maxGroups int) {
	key := func(j jobs.Job) string {
		norm := func(s string) string { return strings.Join(strings.Fields(strings.ToLower(s)), " ") }
		return norm(j.Company) + "|" + norm(j.Position) + "|" + norm(j.Location)
	}

	groups := map[string][]jobs.Job{}
	var order []string
	for _, j := range all {
		k := key(j)
		if _, seen := groups[k]; !seen {
			order = append(order, k)
		}
		groups[k] = append(groups[k], j)
	}

	total, shown := 0, 0
	for _, k := range order {
		g := groups[k]
		if len(g) < 2 {
			continue
		}
		total += len(g) - 1
		if shown >= maxGroups {
			continue
		}
		shown++
		fmt.Printf("\n[%d rows] %s\n", len(g), truncate(k, 90))
		for _, j := range g {
			link := j.PostingURL
			if link == "" {
				link = "(no link)"
			}
			fmt.Printf("   %-14s -> %s\n", truncate(j.SourceRepo, 14), link)
		}
	}

	fmt.Printf("\n=== lookalikes: %d rows share company+title+location with an earlier row ===\n", total)
}

// reportDedupe runs the real dedupe pass and prints what collapsed, so the
// canonicalization rules can be eyeballed against live data. The counts alone
// aren't enough to judge calibration: what matters is whether the rows that
// merged really are the same posting, which needs seeing them side by side.
func reportDedupe(combined []jobs.Job, maxGroups int) []jobs.Job {
	deduped := jobs.Dedupe(combined)

	fmt.Printf("\n=== dedupe: %d -> %d (%d collapsed) ===\n",
		len(combined), len(deduped), len(combined)-len(deduped))

	// Regroup by ID to find which rows merged. Iterate the slice (not a map)
	// so the report is stable between runs.
	groups := map[string][]jobs.Job{}
	var order []string
	for _, j := range combined {
		if _, seen := groups[j.ID]; !seen {
			order = append(order, j.ID)
		}
		groups[j.ID] = append(groups[j.ID], j)
	}

	shown := 0
	for _, id := range order {
		g := groups[id]
		if len(g) < 2 {
			continue
		}
		if shown >= maxGroups {
			fmt.Printf("... and more collapsed groups\n")
			break
		}
		shown++
		fmt.Printf("\n[%s] %d rows merged:\n", id, len(g))
		for _, j := range g {
			link := j.PostingURL
			if link == "" {
				link = "(no link)"
			}
			fmt.Printf("   %-18s | %-40s | %-18s | %s\n",
				truncate(j.Company, 18), truncate(j.Position, 40), truncate(j.Location, 18), truncate(link, 60))
		}
	}

	if shown == 0 {
		fmt.Println("(nothing collapsed)")
	}

	return deduped
}
