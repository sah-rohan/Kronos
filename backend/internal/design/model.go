package design

// SDAttempt is what a member actually built on the canvas for one module -
// kept as raw JSON because only the frontend renderer interprets its shape,
// and it doubles as context for AI design critique.
type SDAttempt struct {
	Slug   string `json:"slug"`
	Design string `json:"design"` // raw JSON
	OK     bool   `json:"ok"`
}

type SDActivityRow struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Slug     string `json:"slug"`
	At       string `json:"at"`
}

type SDLeaderRow struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Count    int    `json:"count"`
}
