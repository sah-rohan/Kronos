package jobs

import (
	"context"
	"regexp"
	"strings"
)

const (
	speedyApplyOwner = "speedyapply"
	speedyApplyRepo  = "2027-SWE-College-Jobs"
	speedyApplyRef   = "main"
	speedyApplyPath  = "README.md"
)

// FetchSpeedyApplyJobs downloads the SpeedyApply internship README and turns
// its Markdown tables into Job structs.
func FetchSpeedyApplyJobs(ctx context.Context, githubToken string) ([]Job, error) {
	md, err := fetchReadme(ctx, githubToken, speedyApplyOwner, speedyApplyRepo, speedyApplyRef, speedyApplyPath)
	if err != nil {
		return nil, err
	}
	return parseSpeedyApplyMarkdown(md), nil
}

// pipeRowPattern matches one Markdown table row: a line that starts and ends
// with "|", e.g. "| Roblox | SWE Intern | SF | $60/hr | <a...> | 1d |".
// This also matches the header row ("| Company | Position | ... |") and the
// separator row ("|---|---|...|") - parseSpeedyApplyMarkdown filters those
// out below, since only real data rows contain an <a ...> link.
var pipeRowPattern = regexp.MustCompile(`(?m)^\|(.+)\|\s*$`)

// parseSpeedyApplyMarkdown walks the "USA SWE Internships" section of the
// README - the one linked in the issue - and extracts every job row from
// every subsection's table (FAANG+, Quant, Other).
func parseSpeedyApplyMarkdown(md string) []Job {
	section := sectionBounds(md, "## 2027 USA SWE Internships", "## ")
	if section == "" {
		return nil
	}

	var jobs []Job
	for _, sub := range splitSubsections(section, "### ") {
		for _, m := range pipeRowPattern.FindAllStringSubmatch(sub.Body, -1) {
			inner := m[1]
			if !strings.Contains(inner, "<a ") {
				continue // header row or the "|---|---|" separator row
			}
			cols := splitPipeRow(inner)
			if job, ok := speedyApplyRowToJob(cols, sub.Title); ok {
				jobs = append(jobs, job)
			}
		}
	}
	return jobs
}

// splitPipeRow splits a table row's inner text on "|" into its cells,
// trimming whitespace from each one.
func splitPipeRow(inner string) []string {
	parts := strings.Split(inner, "|")
	cols := make([]string, len(parts))
	for i, p := range parts {
		cols[i] = strings.TrimSpace(p)
	}
	return cols
}

// speedyApplyRowToJob maps one table row's six columns - Company, Position,
// Location, Salary, Application link, Age - onto a Job. Returns ok=false for
// a malformed row (wrong column count, or no company/position text) so the
// caller can just skip it instead of returning a half-empty Job.
func speedyApplyRowToJob(cols []string, sectionTitle string) (Job, bool) {
	if len(cols) < 6 {
		return Job{}, false
	}

	company := cleanText(stripTags(cols[0]))
	position := cleanText(stripTags(cols[1]))
	if company == "" || position == "" {
		return Job{}, false
	}

	location := cleanText(stripTags(cols[2]))
	salary := cleanText(stripTags(cols[3]))
	if salary == "-" {
		salary = ""
	}
	// Column 0 is a link to the company's website, not the job posting - the
	// real "apply here" link lives in the Application column instead.
	postingURL := firstHref(cols[4])
	age := cleanText(stripTags(cols[5]))

	return Job{
		ID:            newID(company, position, location, postingURL),
		Company:       company,
		Position:      position,
		Location:      location,
		Salary:        salary,
		PostingURL:    postingURL,
		Age:           age,
		SourceRepo:    speedyApplyOwner + "/" + speedyApplyRepo,
		SourceSection: sectionTitle,
	}, true
}
