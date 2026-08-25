package progress

// Types owned by the progress feature. Other features that surface a member's
// progress (social, for a friend's board) import these rather than redefining
// them, so the JSON the client sees is identical on every route.

type LeaderRow struct {
	Name         string `json:"name"`
	LeetcodeUser string `json:"username"`
	Blind75      int    `json:"blind75"`
	Neetcode150  int    `json:"neetcode150"`
	Neetcode250  int    `json:"neetcode250"`
	All          int    `json:"all"`
	Easy         int    `json:"easy"`
	Medium       int    `json:"medium"`
	Hard         int    `json:"hard"`
}

type ProblemRow struct {
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Difficulty  string `json:"difficulty"`
	Category    string `json:"category"`
	Done        bool   `json:"done"`
	Optimal     bool   `json:"optimal"`
	Blind75     bool   `json:"blind75"`
	Neetcode150 bool   `json:"neetcode150"`
	Neetcode250 bool   `json:"neetcode250"`
}

type SolutionRow struct {
	Slug       string  `json:"slug"`
	Lang       string  `json:"lang"`
	Code       string  `json:"code"`
	RuntimeMs  int     `json:"runtimeMs"`
	RuntimePct float64 `json:"runtimePct"`
	Optimal    bool    `json:"optimal"`
}

type RecentRow struct {
	Number     int      `json:"n"`
	Slug       string   `json:"slug"`
	Name       string   `json:"name"`
	Difficulty string   `json:"diff"`
	Who        []string `json:"who"`
	At         string   `json:"at"` // most recent solve, UTC YYYY-MM-DD
}

type DifficultyTotal struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type CalendarProblem struct {
	Date       string `json:"date"` // UTC YYYY-MM-DD
	Slug       string `json:"slug"`
	Title      string `json:"title"`
	Difficulty string `json:"difficulty"`
}
