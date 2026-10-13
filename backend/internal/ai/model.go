package ai

type Tokens struct {
	In  int `json:"in"`
	Out int `json:"out"`
}

type Review struct {
	Slug       string `json:"slug"`
	Text       string `json:"text"`
	Deployment string `json:"deployment"`
	Tokens     Tokens `json:"tokens"`
}
