package career

// Types owned by the career feature: the documents a member keeps on file for
// the coach to read. The coach imports these rather than redefining them, so
// what the model sees and what the client sees come from one shape.

// Resume is one stored resume. Content is omitted from list responses - a
// listing is a picker, and the full text is only worth a round trip when
// something is about to read it.
type Resume struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Content   string `json:"content,omitempty"`
	Primary   bool   `json:"primary"`
	Chars     int    `json:"chars"`
	UpdatedAt string `json:"updatedAt"`
}

// Job is a role the member is applying to. Description is the pasted posting -
// the part the coach actually reasons against.
type Job struct {
	ID          string `json:"id"`
	Company     string `json:"company"`
	Title       string `json:"title"`
	Location    string `json:"location"`
	URL         string `json:"url"`
	Description string `json:"description,omitempty"`
	Status      string `json:"status"`
	UpdatedAt   string `json:"updatedAt"`
}

// Statuses is the application pipeline, in order. The database enforces the
// same set; this copy is what validates input before it gets there.
var Statuses = []string{"saved", "applied", "interviewing", "offer", "rejected"}

func validStatus(s string) bool {
	for _, v := range Statuses {
		if v == s {
			return true
		}
	}
	return false
}
