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

var languages = map[string]string{
	"python":     "Python 3",
	"java":       "Java",
	"cpp":        "C++",
	"javascript": "JavaScript",
	"go":         "Go",
}

// areas is the coding rubric, in display order. The live read and the debrief share it.
var areas = []string{"Understanding", "Approach", "Code", "Complexity", "Testing", "Communication"}

var markScore = map[string]int{"weak": 1, "solid": 2, "strong": 3}

const HintAsk = "/hint"

type StartInput struct {
	Kind       string `json:"kind"`
	Bar        string `json:"bar"`
	Difficulty string `json:"difficulty"`
	Target     string `json:"target"`
	Slug       string `json:"slug"`
	Language   string `json:"language"`
}

type Statement struct {
	Statement   string   `json:"statement"`
	Examples    []string `json:"examples"`
	Constraints []string `json:"constraints"`
}

type Signal struct {
	Mark string `json:"mark"`
	Note string `json:"note"`
}

// Signals is the live read, keyed by rubric area.
type Signals map[string]Signal

type Turn struct {
	Role       string  `json:"role"`
	Content    string  `json:"content"`
	Code       string  `json:"code,omitempty"`
	At         string  `json:"at"`
	Unprompted bool    `json:"unprompted,omitempty"`
	Signals    Signals `json:"signals,omitempty"`
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

	Language    string     `json:"language,omitempty"`
	Problem     *Statement `json:"problem,omitempty"`
	Code        string     `json:"code"`
	CodeVersion int        `json:"codeVersion"`
	Signals     Signals    `json:"signals,omitempty"`
}

type Mark struct {
	Area     string `json:"area"`
	Mark     string `json:"mark"`
	Evidence string `json:"evidence"`
	Ref      string `json:"ref,omitempty"`
}

type Correctness struct {
	Verdict string   `json:"verdict"`
	Issues  []string `json:"issues"`
}

type Complexity struct {
	Stated string `json:"stated"`
	Actual string `json:"actual"`
	Agrees bool   `json:"agrees"`
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

	Correctness *Correctness `json:"correctness,omitempty"`
	Complexity  *Complexity  `json:"complexity,omitempty"`
	Change      string       `json:"change,omitempty"`
}

type List struct {
	Available  bool      `json:"available"`
	Interviews []Summary `json:"interviews"`
}

type CodeInput struct {
	Code     string `json:"code"`
	Language string `json:"language"`
	Version  int    `json:"version"`
}

type Point struct {
	InterviewID string `json:"interviewId"`
	Title       string `json:"title"`
	Mark        string `json:"mark"`
	At          string `json:"at"`
}

type Trend struct {
	Area   string  `json:"area"`
	Points []Point `json:"points"`
	Trend  string  `json:"trend"`
}

type Progress struct {
	Areas []Trend `json:"areas"`
	Focus string  `json:"focus"`
}

type graded struct {
	ID      string
	Title   string
	At      string
	Debrief Debrief
}
