package interview

const (
	KindResume     = "resume"
	KindCoding     = "coding"
	KindBehavioral = "behavioral"
	KindDesign     = "design"

	StatusActive  = "active"
	StatusGrading = "grading"
	StatusGraded  = "graded"
	StatusFailed  = "failed"

	PhaseInterview = "interview"
	PhaseFollowup  = "followup"
)

var minutesFor = map[string]int{
	KindResume:     40,
	KindCoding:     45,
	KindBehavioral: 30,
	KindDesign:     45,
}

var verdicts = []string{"no_hire", "lean_no_hire", "lean_hire", "hire", "strong_hire"}

type StartInput struct {
	Kind       string `json:"kind"`
	Bar        string `json:"bar"`
	Difficulty string `json:"difficulty"`
	Target     string `json:"target"`
}

type Turn struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	Code    string `json:"code,omitempty"`
	At      string `json:"at"`
}

type Summary struct {
	ID        string `json:"id"`
	Kind      string `json:"kind"`
	Bar       string `json:"bar"`
	Title     string `json:"title"`
	Status    string `json:"status"`
	Verdict   string `json:"verdict,omitempty"`
	StartedAt string `json:"startedAt"`
}

type Interview struct {
	Summary
	Difficulty string   `json:"difficulty"`
	Target     string   `json:"target"`
	Subject    string   `json:"subject"`
	Briefing   string   `json:"-"`
	Minutes    int      `json:"minutes"`
	Elapsed    int      `json:"elapsedSeconds"`
	EndedAt    string   `json:"endedAt,omitempty"`
	Turns      []Turn   `json:"turns"`
	Followups  []Turn   `json:"followups"`
	Debrief    *Debrief `json:"debrief,omitempty"`
}

type Mark struct {
	Area     string `json:"area"`
	Mark     string `json:"mark"`
	Evidence string `json:"evidence"`
}

type Moment struct {
	Said     string `json:"said"`
	Stronger string `json:"stronger"`
}

type Debrief struct {
	Verdict string   `json:"verdict"`
	Summary string   `json:"summary"`
	Rubric  []Mark   `json:"rubric"`
	Moment  Moment   `json:"moment"`
	Next    []string `json:"next"`
}

type List struct {
	Available  bool      `json:"available"`
	Interviews []Summary `json:"interviews"`
}
