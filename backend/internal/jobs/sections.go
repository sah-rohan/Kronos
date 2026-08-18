package jobs

import "strings"

// sectionBounds returns the slice of doc that starts at the heading line
// containing titleContains and runs up to (but not including) the next line
// that starts with headingPrefix (e.g. "## "). If no later heading exists,
// it returns the rest of the document. Returns "" if titleContains isn't
// found at all.
//
// This is how we isolate e.g. "just the USA internships section" out of a
// 280-line README before we bother looking for table rows in it.
func sectionBounds(doc, titleContains, headingPrefix string) string {
	start := strings.Index(doc, titleContains)
	if start == -1 {
		return ""
	}
	// Back up to the start of that heading's own line.
	lineStart := strings.LastIndex(doc[:start], "\n") + 1
	body := doc[lineStart:]

	// Search for the next heading line *after* this one, so we don't
	// immediately match the heading we just found.
	afterFirstLine := strings.IndexByte(body, '\n')
	if afterFirstLine == -1 {
		return body
	}
	rest := body[afterFirstLine+1:]
	next := strings.Index(rest, "\n"+headingPrefix)
	if next == -1 {
		return body
	}
	return body[:afterFirstLine+1+next+1]
}

// subsection is one heading + the text under it, as produced by
// splitSubsections below.
type subsection struct {
	Title string
	Body  string
}

// splitSubsections splits body into pieces at each line that starts with
// prefix (e.g. "### "), using the heading text (minus the prefix) as each
// piece's Title. Text before the first matching heading is discarded - the
// two READMEs we scrape never put job rows there.
func splitSubsections(body, prefix string) []subsection {
	var subs []subsection
	var title string
	var buf strings.Builder

	flush := func() {
		if title != "" {
			subs = append(subs, subsection{Title: title, Body: buf.String()})
		}
		buf.Reset()
	}

	for _, line := range strings.Split(body, "\n") {
		if strings.HasPrefix(line, prefix) {
			flush()
			title = strings.TrimSpace(strings.TrimPrefix(line, prefix))
			continue
		}
		buf.WriteString(line)
		buf.WriteByte('\n')
	}
	flush()
	return subs
}
