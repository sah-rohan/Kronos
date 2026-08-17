package jobs

// Canonicalization: turning the many ways one job posting can be written into
// a single normalized form, so that two scrapes of the same job produce the
// same fingerprint.
//
// The problem this solves: the same posting appears in both source READMEs,
// written slightly differently each time - "Acme, Inc." vs "Acme", a link
// with ?utm_source=... vs one without, a trailing slash vs none. Hashing
// those raw strings gives different IDs, so the dashboard shows one job
// several times.
//
// Everything here feeds the ID hash ONLY. The Job struct keeps the original
// human-readable Company/Position/PostingURL for display - we normalize to
// decide "are these the same job", never to decide what the user reads.
//
// The guiding rule throughout is that the two failure modes are NOT equally
// bad. Under-merging shows one job twice, which is mildly annoying.
// Over-merging makes a real job silently disappear, which is much worse. So
// every rule below is written to err toward leaving things separate.

import (
	"net/url"
	"regexp"
	"strings"
	"unicode"
)

// schemePattern matches a leading URL scheme like "https://" so we can tell
// whether a link already has one. Without a scheme, url.Parse reads the whole
// string as a path and the host ends up empty.
var schemePattern = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9+.\-]*://`)

// workdayDisambiguator matches the "-1"/"-2"/"-3" suffix Workday adds to a
// requisition ID when the same req is published to more than one career
// site, e.g. "_R55736-3". The leading underscore-plus-ID is required so a
// job slug that merely ends in a number isn't truncated.
var workdayDisambiguator = regexp.MustCompile(`(_[A-Za-z0-9]+)-\d+$`)

// textFolder collapses characters that look identical to a human but differ
// in bytes. Scraped Markdown is full of these: editors silently substitute
// curly quotes and en-dashes, and zero-width characters ride along invisibly
// from copy-pasted HTML. Note U+00A0 (non-breaking space) is NOT here - it's
// already handled upstream by cleanText, since strings.Fields treats it as
// whitespace.
// Written as escapes rather than literal characters on purpose: several of
// these are invisible in an editor, so a literal would be unreviewable, and
// a literal U+FEFF is outright illegal in Go source.
var textFolder = strings.NewReplacer(
	"\u200b", "", // zero-width space
	"\u200c", "", // zero-width non-joiner
	"\u200d", "", // zero-width joiner
	"\ufeff", "", // byte-order mark
	"\u2018", "'", // left single curly quote
	"\u2019", "'", // right single curly quote
	"\u201c", `"`, // left double curly quote
	"\u201d", `"`, // right double curly quote
	"\u2013", "-", // en dash
	"\u2014", "-", // em dash
)

// punctFolder drops punctuation that varies between spellings of the same
// company name: "Acme, Inc." vs "Acme Inc", "Macy's" vs "Macys".
var punctFolder = strings.NewReplacer(
	".", "",
	",", "",
	"'", "",
)

// trackingParams are query parameters that identify where a click came from
// rather than which job it points at, so two links differing only in these
// are the same posting.
//
// This is a denylist (strip what we know is tracking) rather than an
// allowlist (keep what we know is an ID) on purpose: an unrecognized
// parameter is more likely to be meaningful than not, and leaving it in errs
// toward under-merging, which is the safe direction.
//
// DANGER: note gh_src is here but gh_jid is NOT. They differ by three
// characters and mean opposite things - gh_src is Greenhouse's source token,
// gh_jid is the job ID itself. Stripping gh_jid would merge every Greenhouse
// posting at a company into a single entry.
var trackingParams = map[string]bool{
	// Google Analytics
	"utm_source":   true,
	"utm_medium":   true,
	"utm_campaign": true,
	"utm_term":     true,
	"utm_content":  true,
	"utm_id":       true,
	"_ga":          true,
	"_gl":          true,
	// Ad-network click IDs
	"gclid":   true,
	"fbclid":  true,
	"msclkid": true,
	"mc_cid":  true,
	"mc_eid":  true,
	// Applicant tracking systems
	"gh_src":       true,
	"lever-source": true,
	"lever-origin": true,
	"trk":          true,
	"trackingid":   true,
	"refid":        true,
	"jobsearchtk":  true,
	"iis":          true,
	"iisn":         true,
	"from":         true,
	// Generic referral tagging
	"ref":         true,
	"refsrc":      true,
	"referrer":    true,
	"source":      true,
	"src":         true,
	"campaign_id": true,
}

// legalSuffixes are company-name endings that carry no identifying
// information: "Acme Inc" and "Acme" are the same employer.
//
// Deliberately English-only. Foreign forms (gmbh, ag, sa, nv, bv, pty, pte)
// are likelier to be part of a real name and barely appear in these two
// repos, so stripping them risks over-merging for no practical gain.
//
// "co" is the riskiest entry - it's a real word fragment. It's only ever
// removed as a whole trailing token, and stripLegalSuffix refuses to empty
// a name entirely, so a company genuinely named "Co" survives intact.
var legalSuffixes = map[string]bool{
	"inc":          true,
	"incorporated": true,
	"corp":         true,
	"corporation":  true,
	"llc":          true,
	"ltd":          true,
	"limited":      true,
	"plc":          true,
	"llp":          true,
	"lp":           true,
	"co":           true,
	"company":      true,
}

// canonicalURL normalizes a posting link so that the cosmetic differences
// between two copies of the same link disappear.
//
// This is the most valuable of the three canonicalizers by a wide margin.
// Both scrapers pull the employer's real applicant-tracking link (Greenhouse,
// Lever, Workday), and when the same job appears in both READMEs they almost
// always point at the identical ATS URL. That makes a canonical URL a far
// stronger identity than any amount of normalizing prose - it sidesteps the
// "same role, different wording" problem entirely.
//
// Returns "" for an empty or whitespace-only input, which signals the caller
// to fall back to a company/position/location identity instead.
func canonicalURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	// A protocol-relative link ("//example.com/j/1") needs only the scheme
	// prepended; anything else missing "://" needs the whole prefix.
	switch {
	case strings.HasPrefix(raw, "//"):
		raw = "https:" + raw
	case !schemePattern.MatchString(raw):
		raw = "https://" + raw
	}

	u, err := url.Parse(raw)
	if err != nil {
		// One malformed link shouldn't cost us the whole scrape. Fall back to
		// something deterministic so the job still gets a stable ID.
		return strings.ToLower(raw)
	}

	// http and https serve the same posting, so fold them together rather
	// than letting the scheme split one job into two.
	u.Scheme = "https"

	// Only scheme and host are case-insensitive (RFC 3986). The path is left
	// exactly as found - Workday in particular uses case-sensitive segments,
	// and lowercasing them could collide two genuinely different postings.
	u.Host = strings.TrimPrefix(strings.ToLower(u.Host), "www.")

	// Workday publishes one requisition through several career-site front
	// doors, so the same job reaches us under several URLs:
	//
	//   https://cadence.wd1.myworkdayjobs.com/External_Careers/job/LIVONIA-01/Adams-...
	//   https://cadence.wd1.myworkdayjobs.com/University_Talent/job/LIVONIA-01/Adams-...
	//   https://cadence.wd1.myworkdayjobs.com/Univ_Careers/job/LIVONIA-01/Adams-...
	//
	// The leading segments are the site name (and sometimes a locale, e.g.
	// "/fr-CA/Private_Posting_No_TMP/job/..."); everything from "/job/"
	// onward is the requisition itself. Keeping only that part merges the
	// front doors while still separating genuinely different postings, since
	// two different requisitions have different job paths.
	//
	// This stays deterministic - it's the same kind of rule as stripping a
	// trailing slash, not fuzzy matching - and it's scoped to Workday hosts
	// so it can't affect any other ATS.
	// Workday also appends a per-site disambiguator to the requisition ID
	// when one req is published to several career sites, so the same job
	// ends up as _R55736, _R55736-1, _R55736-2 and _R55736-3. Dropping that
	// suffix is what actually merges them.
	//
	// The pattern is anchored on the underscore that precedes every Workday
	// requisition ID, which keeps it from mangling a title that legitimately
	// ends in a number - "Software-Engineer-2" has no "_reqid" before the
	// trailing digits and is left alone.
	if strings.HasSuffix(u.Host, ".myworkdayjobs.com") {
		if i := strings.Index(u.Path, "/job/"); i >= 0 {
			u.Path = u.Path[i:]
		}
		u.Path = workdayDisambiguator.ReplaceAllString(u.Path, "$1")
	}

	// A trailing slash is cosmetic, but "/" as the entire path is just the
	// site root and is cleaner represented as empty.
	if u.Path == "/" {
		u.Path = ""
	} else {
		u.Path = strings.TrimSuffix(u.Path, "/")
	}

	// Fragments are pure client-side navigation ("#apply") and never change
	// which posting is served.
	u.Fragment = ""
	u.RawFragment = ""

	q := u.Query()
	for key := range q {
		if trackingParams[strings.ToLower(key)] {
			q.Del(key)
		}
	}
	// Encode() sorts by key, so two links carrying the same parameters in a
	// different order come out identical. It also omits "?" when nothing is
	// left, which is what we want.
	u.RawQuery = q.Encode()

	return u.String()
}

// canonicalCompany normalizes an employer name for fingerprinting.
//
// Only used when a posting has no link at all (SimplifyJobs renders closed
// applications as a lock emoji with no href), so this is the fallback path
// rather than the common one.
func canonicalCompany(s string) string {
	s = textFolder.Replace(s)
	s = strings.ToLower(s)

	// "Johnson & Johnson" and "Johnson and Johnson" are one employer. Padding
	// with spaces keeps "J&J" from collapsing into a single token.
	s = strings.ReplaceAll(s, "&", " and ")

	s = punctFolder.Replace(s)
	s = trimNonAlphanumeric(s)
	s = collapseSpaces(s)
	s = stripLegalSuffix(s)

	return collapseSpaces(s)
}

// canonicalPosition normalizes a job title for fingerprinting.
//
// This one is deliberately minimal - it lowercases, folds lookalike
// characters, and strips decoration from the ends. That's all.
//
// It explicitly does NOT map "SWE" to "Software Engineer" or "Intern" to
// "Internship". Those are fuzzy matching, not canonicalization, and they're
// exactly where over-merging starts hiding real jobs. Since canonicalURL
// handles the overwhelming majority of duplicates, title text only decides
// identity for the small tail of postings with no link - a weak reason to
// take that risk.
//
// It also does not strip a leading "New": in this domain "New Grad" is a
// meaningful part of the title, not a badge.
func canonicalPosition(s string) string {
	// Trimming non-alphanumerics from the ends removes decorative markers
	// (lock, star, sparkle emoji) and stray trailing punctuation. Years and
	// parenthetical qualifiers in the middle are left alone, since
	// "Summer 2026" and "(Backend)" genuinely distinguish jobs.
	return foldMinimal(s)
}

// canonicalLocation normalizes a location for fingerprinting.
//
// Only reached on the fallback identity path, where it matters a great deal:
// without it, every closed listing sharing a company and title collapses into
// one entry regardless of city, hiding real openings. Multi-location cells
// arrive pre-joined as "Seattle, WA, Austin, TX" (see lineBreakPattern in
// html.go), and are treated as a single opaque string - two postings listing
// the same cities in a different order stay separate, which is the safe
// direction.
func canonicalLocation(s string) string {
	return foldMinimal(s)
}

// foldMinimal is the light-touch normalization shared by position and
// location: fold lookalike characters, lowercase, strip decoration from the
// ends, and collapse whitespace. Nothing semantic.
func foldMinimal(s string) string {
	s = textFolder.Replace(s)
	s = strings.ToLower(s)
	s = trimNonAlphanumeric(s)
	return collapseSpaces(s)
}

// trimNonAlphanumeric removes leading and trailing runes that are neither
// letters nor digits - emoji, asterisks, stray brackets, whitespace.
func trimNonAlphanumeric(s string) string {
	return strings.TrimFunc(s, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	})
}

// collapseSpaces squeezes runs of whitespace down to single spaces and trims
// the ends, the same normalization cleanText applies to scraped cells.
func collapseSpaces(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

// stripLegalSuffix removes trailing corporate-form tokens, repeatedly, so
// "acme co inc" reduces to "acme".
//
// The len(fields) > 1 guard is what keeps this safe: it will never consume
// the last remaining token, so a company actually named "Co" or "Limited"
// keeps its name instead of canonicalizing to the empty string (which would
// merge it with every other suffix-only name).
func stripLegalSuffix(s string) string {
	fields := strings.Fields(s)
	for len(fields) > 1 && legalSuffixes[fields[len(fields)-1]] {
		fields = fields[:len(fields)-1]
	}
	return strings.Join(fields, " ")
}
