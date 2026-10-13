package coach

// Types owned by the coach: the evidence it reads about a member, and the
// conversation it keeps with them.

// Solved is one problem the member finished this season, without the code.
// The full list is cheap enough to send every time; it is what stops the model
// recommending a problem they already did.
type Solved struct {
	Title      string `json:"title"`
	Slug       string `json:"slug"`
	Difficulty string `json:"difficulty"`
	Category   string `json:"category"`
	At         string `json:"at"`
}

// Solution is a member's own accepted code for one problem - the "how they
// solved it" half of the context. Code is truncated to a per-solution budget
// before it reaches the model.
type Solution struct {
	Title      string  `json:"title"`
	Slug       string  `json:"slug"`
	Difficulty string  `json:"difficulty"`
	Lang       string  `json:"lang"`
	Code       string  `json:"code"`
	RuntimePct float64 `json:"runtimePct"`
	Optimal    bool    `json:"optimal"`
	At         string  `json:"at"`
}

// Counts is the headline shape of a member's progress.
type Counts struct {
	Total       int `json:"total"`
	Easy        int `json:"easy"`
	Medium      int `json:"medium"`
	Hard        int `json:"hard"`
	Blind75     int `json:"blind75"`
	Neetcode150 int `json:"neetcode150"`
	Neetcode250 int `json:"neetcode250"`
}

// Turn is one stored message of a conversation.
type Turn struct {
	Role    string `json:"role"` // "user" | "assistant"
	Content string `json:"content"`
	At      string `json:"at"`
}

// Reply is what a chat call returns: the answer, plus how much evidence the
// model was given, so the UI can show what it read.
type Reply struct {
	Reply  string `json:"reply"`
	Solved int    `json:"solved"`
	Code   int    `json:"code"`
	Resume string `json:"resume"`
	Job    string `json:"job"`
}
