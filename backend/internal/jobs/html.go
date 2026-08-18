package jobs

import (
	"html"
	"regexp"
	"strings"
)

// Both READMEs are Markdown files, but the job tables inside them are
// written as raw HTML (<table>/<tr>/<td>, or plain HTML links inside
// Markdown pipe-table cells). These helpers turn one HTML-ish table cell
// into plain text, since that's all the frontend actually wants to display.

// tagPattern matches any HTML tag, e.g. <a href="...">, </a>, <img ... />.
var tagPattern = regexp.MustCompile(`<[^>]*>`)

// hrefPattern pulls the URL out of the first href="..." attribute it finds.
var hrefPattern = regexp.MustCompile(`href="([^"]*)"`)

// lineBreakPattern matches every line-break spelling the two READMEs use -
// the standard <br>, and SimplifyJobs' <br/> typo'd as </br> - so a
// multi-location cell like "Seattle, WA</br>Austin, TX" becomes
// "Seattle, WA, Austin, TX" instead of the two locations running together.
var lineBreakPattern = regexp.MustCompile(`(?i)<br\s*/?>|</br>`)

// summaryPattern strips a <details><summary>5 locations</summary> label. We
// want the location list that follows it, not the "N locations" summary text.
var summaryPattern = regexp.MustCompile(`(?is)<summary>.*?</summary>`)

// stripTags removes every HTML tag from s (after handling line breaks and
// <summary> specially, see above) and decodes leftover entities like &amp;
// so the result reads like plain text.
func stripTags(s string) string {
	s = summaryPattern.ReplaceAllString(s, "")
	s = lineBreakPattern.ReplaceAllString(s, ", ")
	s = tagPattern.ReplaceAllString(s, "")
	return html.UnescapeString(s)
}

// firstHref returns the URL inside the first href="..." attribute in s, or
// "" if there isn't one (e.g. a closed-application cell that's just an emoji).
func firstHref(s string) string {
	m := hrefPattern.FindStringSubmatch(s)
	if m == nil {
		return ""
	}
	return m[1]
}

// cleanText trims whitespace and collapses repeated spaces/newlines so text
// pulled out of indented HTML reads like a single line.
func cleanText(s string) string {
	return strings.Join(strings.Fields(s), " ")
}
