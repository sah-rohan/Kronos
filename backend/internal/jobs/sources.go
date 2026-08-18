package jobs

// SpeedyApply - internship listings.
//
// Its tables are written as raw HTML (<table>/<tr>/<td>) embedded in the
// Markdown; see parseSpeedyApplyMarkdown in speedyapply.go. Section names
// (FAANG+, Quant, and the rest) come from the README's own headings rather
// than a fixed list here.
const (
	speedyApplyOwner = "speedyapply"
	speedyApplyRepo  = "2027-SWE-College-Jobs"
	speedyApplyRef   = "main"
	speedyApplyPath  = "README.md"
)

// SimplifyJobs - full-time new-grad listings.
//
// Only two of this README's sections are scraped, "Software Engineering New
// Grad Roles" and "Product Management New Grad Roles"; the Data Science/AI,
// Quant and Hardware sections are left alone (see FetchSimplifyJobsNewGrad in
// simplifyjobs.go, where adding one is a single line).
//
// Note the ref: this repo's default branch is "dev", not "main", which is
// unusual enough to be worth stating twice.
const (
	simplifyOwner = "SimplifyJobs"
	simplifyRepo  = "New-Grad-Positions"
	simplifyRef   = "dev"
	simplifyPath  = "README.md"
)
