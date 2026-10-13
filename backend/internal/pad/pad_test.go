package pad

import "testing"

func points(marks ...string) []Point {
	out := []Point{}
	for _, m := range marks {
		out = append(out, Point{Mark: m})
	}
	return out
}

func TestTrend(t *testing.T) {
	cases := map[string][]Point{
		"":          points("weak", "strong", "strong"),
		"improving": points("weak", "weak", "solid", "strong"),
		"slipping":  points("strong", "strong", "solid", "weak"),
		"steady":    points("solid", "strong", "strong", "solid"),
	}
	for want, ps := range cases {
		if got := trend(ps); got != want {
			t.Errorf("trend(%v) = %q, want %q", ps, got, want)
		}
	}
}

func TestFocus(t *testing.T) {
	pad := func(weak ...string) graded {
		g := graded{}
		for _, a := range areas {
			m := "solid"
			for _, w := range weak {
				if w == a {
					m = "weak"
				}
			}
			g.Feedback.Rubric = append(g.Feedback.Rubric, Mark{Area: a, Mark: m})
		}
		return g
	}
	if got := focus([]graded{pad("Testing"), pad("Complexity", "Testing"), pad("Complexity")}); got != "Complexity" {
		t.Errorf("tie should go to rubric order, got %q", got)
	}
	if got := focus([]graded{pad()}); got != "" {
		t.Errorf("no weak areas, got %q", got)
	}
}

func TestFeedbackKeepsRubricOrderAndClampsBlocks(t *testing.T) {
	out := gradeOut{Rubric: map[string]markOut{"code": {Mark: "strong", Block: 7}, "testing": {Mark: "weak", Block: 2}}, Rewrite: Rewrite{Block: 3}}
	f := out.feedback(2)
	if len(f.Rubric) != len(areas) || f.Rubric[2].Area != "Code" || f.Rubric[2].Block != 0 || f.Rubric[4].Block != 2 {
		t.Errorf("rubric: %+v", f.Rubric)
	}
	if f.Rewrite.Block != 0 || f.Correctness.Issues == nil {
		t.Errorf("rewrite/issues: %+v", f)
	}
}
