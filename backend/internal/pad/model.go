package pad

const (
	KindNote = "note"
	KindCode = "code"

	StatusDraft   = "draft"
	StatusGrading = "grading"
	StatusGraded  = "graded"
	StatusFailed  = "failed"
)

var languages = map[string]string{
	"python":     "Python 3",
	"java":       "Java",
	"cpp":        "C++",
	"javascript": "JavaScript",
	"go":         "Go",
}

var areas = []string{"Understanding", "Approach", "Code", "Complexity", "Testing", "Communication"}

var marks = map[string]int{"weak": 1, "solid": 2, "strong": 3}

type Block struct {
	Kind string `json:"kind"`
	Text string `json:"text"`
	At   string `json:"at"`
}

type Summary struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Difficulty  string `json:"difficulty"`
	Category    string `json:"category"`
	Language    string `json:"language"`
	Status      string `json:"status"`
	Overall     string `json:"overall,omitempty"`
	StartedAt   string `json:"startedAt"`
	SubmittedAt string `json:"submittedAt,omitempty"`
}

type Pad struct {
	Summary
	Blocks   []Block   `json:"blocks"`
	Version  int       `json:"version"`
	Attempt  int       `json:"attempt"`
	Feedback *Feedback `json:"feedback,omitempty"`
}

type Mark struct {
	Area     string `json:"area"`
	Mark     string `json:"mark"`
	Evidence string `json:"evidence"`
	Block    int    `json:"block"`
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

type Rewrite struct {
	Block    int    `json:"block"`
	Stronger string `json:"stronger"`
}

type Feedback struct {
	Overall     string      `json:"overall"`
	Summary     string      `json:"summary"`
	Rubric      []Mark      `json:"rubric"`
	Correctness Correctness `json:"correctness"`
	Complexity  Complexity  `json:"complexity"`
	Rewrite     Rewrite     `json:"rewrite"`
	Change      string      `json:"change"`
	Next        []string    `json:"next"`
}

type List struct {
	Available bool      `json:"available"`
	Pads      []Summary `json:"pads"`
}

type Point struct {
	PadID string `json:"padId"`
	Title string `json:"title"`
	Mark  string `json:"mark"`
	At    string `json:"at"`
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

type StartInput struct {
	Slug     string `json:"slug"`
	Language string `json:"language"`
}

type SaveInput struct {
	Blocks   []Block `json:"blocks"`
	Language string  `json:"language"`
	Version  int     `json:"version"`
}

type graded struct {
	Title    string
	At       string
	ID       string
	Feedback Feedback
}
