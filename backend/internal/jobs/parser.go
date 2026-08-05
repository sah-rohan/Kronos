package jobs

import (
    "regexp"
    "strings"
)

// Job is one parsed row from a README markdown table.
type Job struct {
    Source    string // "speedyapply" | "simplify-swe" | "simplify-pm"
    Company   string
    Role      string
    Location  string
    ApplyURL  string
    Posted    string
    IsOpen    bool
}

// linkRe extracts the href from a Markdown link: [text](url)
var linkRe = regexp.MustCompile(`\[.*?\]\((https?://[^)]+)\)`)

// ParseTable parses all jobs from a GitHub README markdown string.
// source is a label like "simplify-swe" that tags every returned job.
// sectionHeader, if non-empty, restricts parsing to the table found after
// a heading that contains that string (case-insensitive). Pass "" to parse
// the first table found.
func ParseTable(markdown, source, sectionHeader string) []Job {
    lines := strings.Split(markdown, "\n")

    inSection := sectionHeader == ""
    inTable := false
    headerParsed := false
    var jobs []Job

    // Column index positions — discovered from the header row.
    colCompany, colRole, colLocation, colLink, colPosted := 0, 1, 2, 3, 4

    for _, raw := range lines {
        line := strings.TrimSpace(raw)

        // Section detection: look for the heading that contains sectionHeader.
        if !inSection && sectionHeader != "" {
            if strings.HasPrefix(line, "#") &&
                strings.Contains(strings.ToLower(line), strings.ToLower(sectionHeader)) {
                inSection = true
            }
            continue
        }

        // Once we've found our section, stop at the next heading.
        if inSection && sectionHeader != "" && inTable &&
            strings.HasPrefix(line, "#") {
            break
        }

        if !strings.HasPrefix(line, "|") {
            if inTable && len(jobs) > 0 {
                // Table ended; if we had a sectionHeader constraint, we're done.
                if sectionHeader != "" {
                    break
                }
                inTable = false
                headerParsed = false
            }
            continue
        }

        cells := splitRow(line)
        if len(cells) < 2 {
            continue
        }

        // Detect and skip separator rows like |---|---|
        if isSeparator(cells) {
            continue
        }

        // First non-separator pipe row is the header.
        if !headerParsed {
            inTable = true
            headerParsed = true
            // Discover column positions from header text.
            for i, c := range cells {
                lower := strings.ToLower(strings.TrimSpace(c))
                switch {
                case strings.Contains(lower, "company"):
                    colCompany = i
                case strings.Contains(lower, "role") || strings.Contains(lower, "title") || strings.Contains(lower, "position"):
                    colRole = i
                case strings.Contains(lower, "location"):
                    colLocation = i
                case strings.Contains(lower, "link") || strings.Contains(lower, "application") || strings.Contains(lower, "apply"):
                    colLink = i
                case strings.Contains(lower, "date") || strings.Contains(lower, "posted") || strings.Contains(lower, "added"):
                    colPosted = i
                }
            }
            continue
        }

        if !inTable {
            continue
        }

        // Guard against out-of-bounds access.
        maxCol := max(colCompany, colRole, colLocation, colLink, colPosted)
        if len(cells) <= maxCol {
            continue
        }

        linkCell := strings.TrimSpace(cells[colLink])
        // 🔒 means the application closed — still record it but mark closed.
        isOpen := !strings.Contains(linkCell, "🔒")

        applyURL := ""
        if m := linkRe.FindStringSubmatch(linkCell); m != nil {
            applyURL = m[1]
        }
        // Skip rows with no usable link at all.
        if applyURL == "" && isOpen {
            continue
        }

        company := cleanCell(cells[colCompany])
        role := cleanCell(cells[colRole])
        if company == "" || role == "" {
            continue
        }

        jobs = append(jobs, Job{
            Source:   source,
            Company:  company,
            Role:     role,
            Location: cleanCell(cells[colLocation]),
            ApplyURL: applyURL,
            Posted:   cleanCell(cells[colPosted]),
            IsOpen:   isOpen,
        })
    }
    return jobs
}

// splitRow splits a markdown table row on | and trims each cell.
func splitRow(line string) []string {
    // Strip leading/trailing |
    line = strings.Trim(line, "|")
    parts := strings.Split(line, "|")
    for i, p := range parts {
        parts[i] = strings.TrimSpace(p)
    }
    return parts
}

// isSeparator returns true for rows like |---|:---|-----|
func isSeparator(cells []string) bool {
    for _, c := range cells {
        c = strings.TrimSpace(c)
        if c == "" {
            continue
        }
        stripped := strings.Trim(c, "-: ")
        if stripped != "" {
            return false
        }
    }
    return true
}

// cleanCell strips markdown links down to their display text, removes emoji
// and extra whitespace.
var displayTextRe = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
var emojiRe = regexp.MustCompile(`[\x{1F000}-\x{1FFFF}↗↙✓✗]`)

func cleanCell(s string) string {
    // Collapse markdown links to display text.
    s = displayTextRe.ReplaceAllString(s, "$1")
    // Strip emoji.
    s = emojiRe.ReplaceAllStringFunc(s, func(string) string { return "" })
    return strings.TrimSpace(s)
}

func max(vals ...int) int {
    m := vals[0]
    for _, v := range vals[1:] {
        if v > m {
            m = v
        }
    }
    return m
}
