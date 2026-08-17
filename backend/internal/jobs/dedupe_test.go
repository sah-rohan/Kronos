package jobs

import (
	"reflect"
	"testing"
)

// TestNewIDURLFirst pins down the identity scheme: when a link is present it
// alone decides identity, so differences in company and title wording stop
// mattering.
func TestNewIDURLFirst(t *testing.T) {
	speedy := newID("Acme, Inc.", "Software Engineer Intern", "Seattle, WA",
		"https://boards.greenhouse.io/acme/jobs/1?utm_source=github")
	simplify := newID("Acme", "SWE Intern", "Seattle, WA",
		"http://www.boards.greenhouse.io/acme/jobs/1/")

	if speedy != simplify {
		t.Errorf("same posting from two sources produced different IDs: %q vs %q", speedy, simplify)
	}
}

func TestNewIDDifferentURLsStaySeparate(t *testing.T) {
	a := newID("Acme", "SWE Intern", "Seattle, WA", "https://boards.greenhouse.io/acme?gh_jid=1")
	b := newID("Acme", "SWE Intern", "Seattle, WA", "https://boards.greenhouse.io/acme?gh_jid=2")

	if a == b {
		t.Errorf("two different Greenhouse postings collapsed to the same ID %q", a)
	}
}

// TestNewIDFallbackIncludesLocation guards the bug the old three-field key
// had: closed listings carry no URL, so without location in the key every
// closed role at one company with one title merged into a single entry.
func TestNewIDFallbackIncludesLocation(t *testing.T) {
	seattle := newID("Acme", "SWE Intern", "Seattle, WA", "")
	austin := newID("Acme", "SWE Intern", "Austin, TX", "")

	if seattle == austin {
		t.Error("closed listings in different cities collapsed to one ID")
	}
}

func TestNewIDFallbackCanonicalizes(t *testing.T) {
	a := newID("Acme, Inc.", "Software Engineer", "Seattle, WA", "")
	b := newID("ACME", "Software Engineer", "seattle, wa", "")

	if a != b {
		t.Errorf("same linkless posting produced different IDs: %q vs %q", a, b)
	}
}

// TestNewIDSchemesDoNotCollide checks the "u|" / "cpl|" namespacing.
func TestNewIDSchemesDoNotCollide(t *testing.T) {
	withURL := newID("Acme", "SWE Intern", "Seattle, WA", "https://acme.com/j/1")
	withoutURL := newID("Acme", "SWE Intern", "Seattle, WA", "")

	if withURL == withoutURL {
		t.Error("URL identity collided with company/position/location identity")
	}
}

func TestDedupeCollapsesDuplicates(t *testing.T) {
	all := []Job{
		{ID: "a", Company: "Acme", Position: "SWE"},
		{ID: "b", Company: "Globex", Position: "SWE"},
		{ID: "a", Company: "Acme", Position: "SWE"},
	}

	got := Dedupe(all)
	if len(got) != 2 {
		t.Fatalf("expected 2 jobs after dedupe, got %d: %+v", len(got), got)
	}
}

// TestDedupePreservesFirstSeenOrder is the regression test for the map
// iteration trap. Offset pagination slices this list, so a shuffled order
// between scrapes would make readers skip and repeat jobs across pages.
func TestDedupePreservesFirstSeenOrder(t *testing.T) {
	all := []Job{
		{ID: "c", Company: "Third"},
		{ID: "a", Company: "First"},
		{ID: "b", Company: "Second"},
		{ID: "a", Company: "First"}, // duplicate, must not move "a" later
	}

	got := Dedupe(all)
	want := []string{"c", "a", "b"}

	if len(got) != len(want) {
		t.Fatalf("expected %d jobs, got %d", len(want), len(got))
	}
	for i, id := range want {
		if got[i].ID != id {
			t.Errorf("position %d: got ID %q, want %q", i, got[i].ID, id)
		}
	}
}

// TestDedupeIsDeterministic runs the same input repeatedly, since a
// map-iteration bug would only show up intermittently.
func TestDedupeIsDeterministic(t *testing.T) {
	all := []Job{}
	for _, id := range []string{"e", "d", "c", "b", "a", "e", "d", "c"} {
		all = append(all, Job{ID: id, Company: id})
	}

	first := Dedupe(all)
	for i := 0; i < 50; i++ {
		if got := Dedupe(all); !reflect.DeepEqual(got, first) {
			t.Fatalf("run %d differed from the first run:\n got: %+v\nfirst: %+v", i, got, first)
		}
	}
}

// TestDedupeEnriches covers the reason merging beats discarding: the sources
// carry complementary data.
func TestDedupeEnriches(t *testing.T) {
	all := []Job{
		{ID: "a", Company: "Acme", Position: "SWE", SourceRepo: "speedyapply/x"},
		{ID: "a", Company: "Acme", Position: "SWE", Salary: "$120k", Age: "3d", Location: "Seattle, WA"},
	}

	got := Dedupe(all)
	if len(got) != 1 {
		t.Fatalf("expected 1 job, got %d", len(got))
	}
	if got[0].Salary != "$120k" {
		t.Errorf("salary should have been filled from the duplicate, got %q", got[0].Salary)
	}
	if got[0].Location != "Seattle, WA" {
		t.Errorf("location should have been filled from the duplicate, got %q", got[0].Location)
	}
	if got[0].SourceRepo != "speedyapply/x" {
		t.Errorf("primary's SourceRepo should win, got %q", got[0].SourceRepo)
	}
}

// TestDedupeClosedRequiresAgreement covers the deliberate bias toward showing
// jobs rather than hiding them.
func TestDedupeClosedRequiresAgreement(t *testing.T) {
	tests := []struct {
		name       string
		a, b       bool
		wantClosed bool
	}{
		{"both open", false, false, false},
		{"primary open, duplicate closed", false, true, false},
		{"primary closed, duplicate open", true, false, false},
		{"both closed", true, true, true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := Dedupe([]Job{
				{ID: "a", Closed: tc.a},
				{ID: "a", Closed: tc.b},
			})
			if len(got) != 1 {
				t.Fatalf("expected 1 job, got %d", len(got))
			}
			if got[0].Closed != tc.wantClosed {
				t.Errorf("Closed = %v, want %v", got[0].Closed, tc.wantClosed)
			}
		})
	}
}

// TestDedupeKeepsEmptyIDsSeparate - collapsing every unidentifiable row into
// one entry would hide real postings.
func TestDedupeKeepsEmptyIDsSeparate(t *testing.T) {
	all := []Job{
		{ID: "", Company: "Acme"},
		{ID: "", Company: "Globex"},
	}

	if got := Dedupe(all); len(got) != 2 {
		t.Errorf("expected both empty-ID jobs kept, got %d", len(got))
	}
}

func TestDedupeEmptyInput(t *testing.T) {
	if got := Dedupe(nil); len(got) != 0 {
		t.Errorf("expected empty result, got %+v", got)
	}
}

// TestDedupeKeepsDistinctRolesAtOneCompany covers SimplifyJobs' "↳" rows,
// which share a company cell but are genuinely different roles.
func TestDedupeKeepsDistinctRolesAtOneCompany(t *testing.T) {
	all := []Job{
		{ID: newID("Acme", "Software Engineer Intern", "Seattle, WA", ""), Company: "Acme"},
		{ID: newID("Acme", "Data Scientist Intern", "Seattle, WA", ""), Company: "Acme"},
		{ID: newID("Acme", "Product Manager Intern", "Seattle, WA", ""), Company: "Acme"},
	}

	if got := Dedupe(all); len(got) != 3 {
		t.Errorf("three distinct roles at one company collapsed to %d", len(got))
	}
}
