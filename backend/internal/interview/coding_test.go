package interview

import (
	"testing"
	"time"
)

func TestAwaitingAnswer(t *testing.T) {
	now := time.Date(2026, 10, 13, 12, 0, 0, 0, time.UTC)
	at := func(ago time.Duration) string { return now.Add(-ago).Format(time.RFC3339) }
	cases := []struct {
		turns []Turn
		want  bool
	}{
		{nil, false},
		{[]Turn{{Role: "assistant", At: at(time.Minute)}}, true},
		{[]Turn{{Role: "assistant", At: at(5 * time.Minute)}}, false},
		{[]Turn{{Role: "assistant", At: at(time.Minute)}, {Role: "user", At: at(30 * time.Second)}}, false},
	}
	for i, c := range cases {
		if got := awaitingAnswer(c.turns, now); got != c.want {
			t.Errorf("case %d: got %v", i, got)
		}
	}
}

func TestTrendAndFocus(t *testing.T) {
	pts := func(ms ...string) []Point {
		out := []Point{}
		for _, m := range ms {
			out = append(out, Point{Mark: m})
		}
		return out
	}
	if trend(pts("weak", "weak", "solid", "strong")) != "improving" || trend(pts("strong", "strong", "solid", "weak")) != "slipping" || trend(pts("solid", "strong")) != "" {
		t.Error("trend")
	}
	g := func(weak ...string) graded {
		var d graded
		for _, a := range areas {
			m := "solid"
			for _, w := range weak {
				if w == a {
					m = "weak"
				}
			}
			d.Debrief.Rubric = append(d.Debrief.Rubric, Mark{Area: a, Mark: m})
		}
		return d
	}
	if f := focus([]graded{g("Testing"), g("Complexity", "Testing"), g("Complexity")}); f != "Complexity" {
		t.Errorf("focus tie should follow rubric order, got %q", f)
	}
}

func TestCodingDebriefKeepsRubricOrder(t *testing.T) {
	d := codingDebrief{Rubric: map[string]Mark{"testing": {Mark: "weak", Ref: "line 4"}, "understanding": {Mark: "strong"}}}.debrief()
	if len(d.Rubric) != len(areas) || d.Rubric[0].Area != "Understanding" || d.Rubric[4].Ref != "line 4" || d.Correctness.Issues == nil {
		t.Errorf("%+v", d)
	}
}
