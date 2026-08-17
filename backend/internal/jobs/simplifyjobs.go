package jobs

import (
	"context"
	"regexp"
	"strings"
)

const (
	simplifyOwner = "SimplifyJobs"
	simplifyRepo  = "New-Grad-Positions"
	// The repo's default branch is "dev", not "main" - worth calling out
	// since almost every other GitHub repo defaults to "main".
	simplifyRef  = "dev"
	simplifyPath = "README.md"
)

// FetchSimplifyJobsNewGrad downloads the SimplifyJobs New-Grad-Positions
// README and extracts jobs from the two sections the issue asked for:
// Software Engineering and Product Management. (The README also has Data
// Science/AI, Quant, and Hardware sections - not scraped here, but adding
// one is a one-line call to parseSimplifySection, see below.)
func FetchSimplifyJobsNewGrad(ctx context.Context, githubToken string) ([]Job, error) {
	md, err := fetchReadme(ctx, githubToken, simplifyOwner, simplifyRepo, simplifyRef, simplifyPath)
	if err != nil {
		return nil, err
	}

	var jobs []Job
	jobs = append(jobs, parseSimplifySection(md, "Software Engineering New Grad Roles", "Software Engineering")...)
	jobs = append(jobs, parseSimplifySection(md, "Product Management New Grad Roles", "Product Management")...)
	return jobs, nil
}

// parseSimplifySection isolates one "## <emoji> <headingContains>" section
// of the README (by searching for headingContains, since the emoji prefix
// makes an exact match brittle) and parses the HTML table inside it.
func parseSimplifySection(md, headingContains, sectionLabel string) []Job {
	section := sectionBounds(md, headingContains, "## ")
	if section == "" {
		return nil
	}
	return parseSimplifyHTMLTable(section, sectionLabel)
}

// Unlike SpeedyApply's Markdown pipe tables, SimplifyJobs writes each job
// table as raw HTML: <table><thead>...</thead><tbody><tr><td>...</tbody></table>.
// We only want the <tbody> rows (the <thead> just has column labels).
var (
	tbodyPattern = regexp.MustCompile(`(?is)<tbody>(.*?)</tbody>`)
	trPattern    = regexp.MustCompile(`(?is)<tr>(.*?)</tr>`)
	tdPattern    = regexp.MustCompile(`(?is)<td>(.*?)</td>`)
)

// parseSimplifyHTMLTable extracts every job row out of section's HTML table.
// Each row has 5 cells: Company, Role, Location, Application, Age.
func parseSimplifyHTMLTable(section, sectionLabel string) []Job {
	body := tbodyPattern.FindStringSubmatch(section)
	if body == nil {
		return nil
	}

	var jobs []Job
	lastCompany := "" // see the "↳" handling below
	for _, tr := range trPattern.FindAllStringSubmatch(body[1], -1) {
		cells := tdPattern.FindAllStringSubmatch(tr[1], -1)
		if len(cells) < 5 {
			continue
		}

		// SimplifyJobs collapses repeat roles at the same company: the first
		// row has the company name, and every following row for that same
		// company just has "↳" in the Company cell. Reuse the last real
		// company name whenever we see that marker.
		company := cleanText(stripTags(cells[0][1]))
		if company == "↳" || company == "" {
			company = lastCompany
		} else {
			lastCompany = company
		}
		if company == "" {
			continue
		}

		position := cleanText(stripTags(cells[1][1]))
		location := cleanText(stripTags(cells[2][1]))
		applicationCell := cells[3][1]
		age := cleanText(stripTags(cells[4][1]))

		// A closed application's cell is just a 🔒 emoji with no link.
		closed := strings.Contains(applicationCell, "🔒")
		postingURL := firstHref(applicationCell)

		jobs = append(jobs, Job{
			ID:            newID(company, position, location, postingURL),
			Company:       company,
			Position:      position,
			Location:      location,
			PostingURL:    postingURL,
			Age:           age,
			Closed:        closed,
			SourceRepo:    simplifyOwner + "/" + simplifyRepo,
			SourceSection: sectionLabel,
		})
	}
	return jobs
}
