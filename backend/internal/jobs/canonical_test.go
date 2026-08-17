package jobs

// Tests for canonical.go.
//
// These are written as three kinds of table:
//
//   - exact-output tests, pinning down what a canonicalizer actually returns;
//   - "must merge" pairs, where two spellings of one job have to collapse to
//     the same canonical form;
//   - "must NOT merge" pairs, where two genuinely different jobs have to stay
//     apart.
//
// The third kind is the important one. Any canonicalizer can be made to merge
// more by adding rules; the failure that actually hurts users is a rule that
// merges too much and makes a real posting vanish from the dashboard. Those
// cases are cheap to write and are the regression net for every future rule.

import "testing"

func TestCanonicalURL(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"empty", "", ""},
		{"whitespace only", "   ", ""},
		{
			"already canonical",
			"https://boards.greenhouse.io/acme/jobs/123",
			"https://boards.greenhouse.io/acme/jobs/123",
		},
		{
			"trailing slash removed",
			"https://boards.greenhouse.io/acme/jobs/123/",
			"https://boards.greenhouse.io/acme/jobs/123",
		},
		{
			"http folded to https",
			"http://boards.greenhouse.io/acme/jobs/123",
			"https://boards.greenhouse.io/acme/jobs/123",
		},
		{
			"www stripped and host lowercased",
			"https://WWW.Lever.co/acme/123",
			"https://lever.co/acme/123",
		},
		{
			// Only scheme and host are case-insensitive, so the path is left
			// exactly as found. Uses a non-Workday host to keep this case
			// isolated from the career-site trimming below.
			"path case preserved",
			"https://acme.com/en-US/Careers/job/SoftwareEngineer",
			"https://acme.com/en-US/Careers/job/SoftwareEngineer",
		},
		{
			"workday career site and locale trimmed, case preserved",
			"https://acme.wd1.myworkdayjobs.com/en-US/Careers/job/SoftwareEngineer",
			"https://acme.wd1.myworkdayjobs.com/job/SoftwareEngineer",
		},
		{
			"fragment dropped",
			"https://lever.co/acme/123#apply",
			"https://lever.co/acme/123",
		},
		{
			"tracking params stripped",
			"https://lever.co/acme/123?utm_source=github&utm_campaign=newgrad",
			"https://lever.co/acme/123",
		},
		{
			"job id preserved while tracking stripped",
			"https://boards.greenhouse.io/acme?gh_src=abcd&gh_jid=987",
			"https://boards.greenhouse.io/acme?gh_jid=987",
		},
		{
			"remaining params sorted",
			"https://lever.co/acme?z=1&a=2",
			"https://lever.co/acme?a=2&z=1",
		},
		{
			"missing scheme defaulted",
			"boards.greenhouse.io/acme/jobs/1",
			"https://boards.greenhouse.io/acme/jobs/1",
		},
		{
			"protocol relative",
			"//boards.greenhouse.io/acme/jobs/1",
			"https://boards.greenhouse.io/acme/jobs/1",
		},
		{
			"bare root path emptied",
			"https://acme.com/",
			"https://acme.com",
		},
		{
			"surrounding whitespace trimmed",
			"  https://lever.co/acme/123  ",
			"https://lever.co/acme/123",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := canonicalURL(tc.in); got != tc.want {
				t.Errorf("canonicalURL(%q)\n got: %q\nwant: %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestCanonicalURLMustMerge(t *testing.T) {
	pairs := []struct {
		name string
		a, b string
	}{
		{
			"trailing slash",
			"https://boards.greenhouse.io/acme/jobs/123",
			"https://boards.greenhouse.io/acme/jobs/123/",
		},
		{
			"scheme and www",
			"http://www.acme.com/jobs/1",
			"https://acme.com/jobs/1",
		},
		{
			"tracking params only difference",
			"https://boards.greenhouse.io/acme?gh_jid=9&utm_source=gh",
			"https://boards.greenhouse.io/acme?gh_jid=9",
		},
		{
			"param order",
			"https://acme.com/j?a=1&b=2",
			"https://acme.com/j?b=2&a=1",
		},
		{
			"fragment",
			"https://acme.com/jobs/1#apply",
			"https://acme.com/jobs/1",
		},
		{
			"ad click id",
			"https://acme.com/jobs/1?gclid=xyz",
			"https://acme.com/jobs/1",
		},
		{
			"lever source tag",
			"https://jobs.lever.co/acme/abc?lever-source=LinkedIn",
			"https://jobs.lever.co/acme/abc",
		},
		{
			// Observed live: Cadence lists one requisition under four
			// different Workday career sites.
			"workday career site segment",
			"https://cadence.wd1.myworkdayjobs.com/External_Careers/job/LIVONIA-01/Adams-Application-Software-Developer",
			"https://cadence.wd1.myworkdayjobs.com/University_Talent_NCG/job/LIVONIA-01/Adams-Application-Software-Developer",
		},
		{
			// Observed live: RTX, where one variant also carries a locale
			// segment ahead of the site name.
			"workday locale segment",
			"https://globalhr.wd5.myworkdayjobs.com/fr-CA/Private_Posting_No_TMP/job/US-AZ-TUCSON/Software-Engineer",
			"https://globalhr.wd5.myworkdayjobs.com/rec_rtx_ext_gateway/job/US-AZ-TUCSON/Software-Engineer",
		},
		{
			// Observed live: Salesforce publishes requisition JR355250 to
			// both its external site and its new-grad portal, and the second
			// copy carries a "-1" disambiguator.
			"workday requisition disambiguator",
			"https://salesforce.wd12.myworkdayjobs.com/External_Career_Site/job/California---San-Francisco/Software-Engineering-AMTS--College-Grad-_JR355250-1",
			"https://salesforce.wd12.myworkdayjobs.com/Futureforce_NewGradRoles/job/California---San-Francisco/Software-Engineering-AMTS--College-Grad-_JR355250",
		},
		{
			// Observed live: Cadence publishes requisition R55736 to four
			// career sites, numbered -1 through -3 plus a bare copy.
			"workday four career sites, one requisition",
			"https://cadence.wd1.myworkdayjobs.com/External_Careers/job/LIVONIA-01/Adams-Application-Software-Developer---Recent-Grad-2026-_R55736-3",
			"https://cadence.wd1.myworkdayjobs.com/University_Talent_NCG/job/LIVONIA-01/Adams-Application-Software-Developer---Recent-Grad-2026-_R55736",
		},
	}

	for _, tc := range pairs {
		t.Run(tc.name, func(t *testing.T) {
			if got, want := canonicalURL(tc.a), canonicalURL(tc.b); got != want {
				t.Errorf("expected these to canonicalize the same:\n a: %q -> %q\n b: %q -> %q",
					tc.a, got, tc.b, want)
			}
		})
	}
}

func TestCanonicalURLMustNotMerge(t *testing.T) {
	pairs := []struct {
		name string
		a, b string
	}{
		{
			"different greenhouse job ids",
			"https://boards.greenhouse.io/acme?gh_jid=1",
			"https://boards.greenhouse.io/acme?gh_jid=2",
		},
		{
			"different indeed job keys",
			"https://indeed.com/viewjob?jk=aaa",
			"https://indeed.com/viewjob?jk=bbb",
		},
		{
			"different paths",
			"https://acme.com/jobs/1",
			"https://acme.com/jobs/2",
		},
		{
			"different hosts",
			"https://acme.com/jobs/1",
			"https://globex.com/jobs/1",
		},
		{
			"workday path case is significant",
			"https://acme.wd1.myworkdayjobs.com/job/SoftwareEngineer",
			"https://acme.wd1.myworkdayjobs.com/job/softwareengineer",
		},
		{
			"different linkedin job ids",
			"https://linkedin.com/jobs/view?currentJobId=111",
			"https://linkedin.com/jobs/view?currentJobId=222",
		},
		{
			// The Workday rule must still separate real requisitions - this
			// is the pair Cadence actually has, two distinct roles under the
			// same career sites.
			"workday different job slugs",
			"https://cadence.wd1.myworkdayjobs.com/External_Careers/job/LIVONIA-01/Adams-Application-Software-Developer",
			"https://cadence.wd1.myworkdayjobs.com/External_Careers/job/LIVONIA-01/Adams-Multibody-Dynamics-Developer",
		},
		{
			"workday different tenants",
			"https://cadence.wd1.myworkdayjobs.com/External_Careers/job/X/Role",
			"https://salesforce.wd12.myworkdayjobs.com/External_Career_Site/job/X/Role",
		},
		{
			// The rule is scoped to Workday hosts: a lookalike path segment
			// elsewhere must not be stripped.
			"non-workday host keeps full path",
			"https://acme.com/careers/job/X/Role",
			"https://acme.com/interns/job/X/Role",
		},
		{
			// Observed live: RTX has three genuinely distinct requisitions,
			// two of them at different buildings. Different req IDs must
			// survive the disambiguator rule.
			"workday different requisition ids",
			"https://globalhr.wd5.myworkdayjobs.com/rec_rtx_ext_gateway/job/US-AZ-TUCSON-801/Software-Engineer-I--Onsite-_01865026-1",
			"https://globalhr.wd5.myworkdayjobs.com/fr-CA/Private_Posting_No_TMP/job/US-AZ-TUCSON-801/Software-Engineer-I--Onsite-_01866246",
		},
		{
			// A title ending in a level number has no "_reqid" before the
			// digits, so the disambiguator rule must leave it intact.
			"workday title ending in a number",
			"https://acme.wd1.myworkdayjobs.com/Careers/job/X/Software-Engineer-2",
			"https://acme.wd1.myworkdayjobs.com/Careers/job/X/Software-Engineer-3",
		},
	}

	for _, tc := range pairs {
		t.Run(tc.name, func(t *testing.T) {
			if got, other := canonicalURL(tc.a), canonicalURL(tc.b); got == other {
				t.Errorf("these are different jobs but both canonicalized to %q\n a: %q\n b: %q",
					got, tc.a, tc.b)
			}
		})
	}
}

func TestCanonicalCompany(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"plain", "Acme", "acme"},
		{"lowercased", "ACME", "acme"},
		{"trailing inc with comma", "Acme, Inc.", "acme"},
		{"trailing incorporated", "Acme Incorporated", "acme"},
		{"trailing corp", "Acme Corp.", "acme"},
		{"trailing corporation", "Acme Corporation", "acme"},
		{"trailing llc", "Acme LLC", "acme"},
		{"trailing ltd", "Acme Ltd.", "acme"},
		{"trailing company", "The Walt Disney Company", "the walt disney"},
		{"stacked suffixes", "Acme Co Inc", "acme"},
		{"ampersand expanded", "Johnson & Johnson", "johnson and johnson"},
		{"apostrophe removed", "Macy's", "macys"},
		{"leading emoji stripped", "⭐ Acme", "acme"},
		{"internal whitespace collapsed", "Acme   Labs", "acme labs"},
		{"curly apostrophe folded", "Macy\u2019s", "macys"},
		{"zero width space removed", "Ac\u200bme", "acme"},
		{"en dash folded to hyphen", "Acme\u2013Globex", "acme-globex"},

		// The guard in stripLegalSuffix: a name that is nothing but a suffix
		// keeps its token rather than canonicalizing to "", which would merge
		// every such company together.
		{"suffix-only name survives", "Co", "co"},
		{"limited alone survives", "Limited", "limited"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := canonicalCompany(tc.in); got != tc.want {
				t.Errorf("canonicalCompany(%q)\n got: %q\nwant: %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestCanonicalCompanyMustMerge(t *testing.T) {
	pairs := []struct {
		name string
		a, b string
	}{
		{"legal suffix", "Acme, Inc.", "Acme"},
		{"corp vs corporation", "Acme Corp", "Acme Corporation"},
		{"case", "ACME", "acme"},
		{"ampersand vs and", "Johnson & Johnson", "Johnson and Johnson"},
		{"curly vs straight apostrophe", "Macy\u2019s", "Macy's"},
		{"padded whitespace", "  Acme  ", "Acme"},
		{"internal double space", "Acme  Labs", "Acme Labs"},
		{"decorative emoji", "⭐ Acme", "Acme"},
	}

	for _, tc := range pairs {
		t.Run(tc.name, func(t *testing.T) {
			if got, want := canonicalCompany(tc.a), canonicalCompany(tc.b); got != want {
				t.Errorf("expected these to canonicalize the same:\n a: %q -> %q\n b: %q -> %q",
					tc.a, got, tc.b, want)
			}
		})
	}
}

func TestCanonicalCompanyMustNotMerge(t *testing.T) {
	pairs := []struct {
		name string
		a, b string
	}{
		{"different employers", "Acme", "Globex"},
		{"parent vs subsidiary naming", "Acme Labs", "Acme"},
		{"similar prefix", "Acme", "Acme Health"},
	}

	for _, tc := range pairs {
		t.Run(tc.name, func(t *testing.T) {
			if got, other := canonicalCompany(tc.a), canonicalCompany(tc.b); got == other {
				t.Errorf("these are different employers but both canonicalized to %q\n a: %q\n b: %q",
					got, tc.a, tc.b)
			}
		})
	}
}

func TestCanonicalPosition(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"plain", "Software Engineer Intern", "software engineer intern"},
		{"lock emoji stripped", "🔒 Software Engineer Intern", "software engineer intern"},
		{"sparkle emoji stripped", "🆕 Backend Engineer", "backend engineer"},
		{"trailing period stripped", "Software Engineer Intern.", "software engineer intern"},
		{"whitespace collapsed", "Software   Engineer", "software engineer"},
		{"em dash folded", "Engineer\u2014Backend", "engineer-backend"},
		{"zero width joiner removed", "Soft\u200dware Engineer", "software engineer"},

		// "New Grad" is a meaningful title in this domain, not a badge - the
		// leading word must survive.
		{"new grad preserved", "New Grad Software Engineer", "new grad software engineer"},

		// Years and parenthetical qualifiers distinguish real jobs and are
		// left untouched in the middle of a title.
		{"year preserved", "SWE Intern Summer 2027", "swe intern summer 2027"},
		{"qualifier preserved", "Software Engineer (Backend)", "software engineer (backend"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := canonicalPosition(tc.in); got != tc.want {
				t.Errorf("canonicalPosition(%q)\n got: %q\nwant: %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestCanonicalPositionMustNotMerge(t *testing.T) {
	pairs := []struct {
		name string
		a, b string
	}{
		{
			"different years are different jobs",
			"SWE Intern Summer 2026",
			"SWE Intern Summer 2027",
		},
		{
			"different specializations",
			"Software Engineer (Backend)",
			"Software Engineer (Frontend)",
		},
		{
			"seniority",
			"Software Engineer",
			"Senior Software Engineer",
		},
		{
			"new grad is not the same as intern",
			"New Grad Software Engineer",
			"Software Engineer Intern",
		},
		{
			// Deliberately unmerged: expanding SWE to Software Engineer is
			// fuzzy matching, and canonicalURL already covers the duplicates
			// that matter. If this ever starts failing, someone added a
			// synonym rule - make sure that was intentional.
			"abbreviation left alone by design",
			"SWE Intern",
			"Software Engineer Intern",
		},
	}

	for _, tc := range pairs {
		t.Run(tc.name, func(t *testing.T) {
			if got, other := canonicalPosition(tc.a), canonicalPosition(tc.b); got == other {
				t.Errorf("these are different roles but both canonicalized to %q\n a: %q\n b: %q",
					got, tc.a, tc.b)
			}
		})
	}
}
