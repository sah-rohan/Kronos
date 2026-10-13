package pad

import (
	"context"
	"errors"
	"strings"
	"time"

	"kronos/internal/domain"
	"kronos/internal/platform/ai"
)

const (
	maxSubmitsPerDay  = 10
	maxBlocks         = 60
	maxPadBytes       = 40000
	maxFeedbackTokens = 8000
	gradeAttempts     = 2
	listLimit         = 50
	progressPads      = 10
	historyPads       = 3
	focusWindow       = 5
	stuckAfter        = 15 * time.Minute
)

const firstNote = "Restate the problem and its constraints."

var (
	ErrUnavailable = errors.New("practice unavailable")
	ErrInvalid     = errors.New("invalid request")
	ErrLimit       = errors.New("daily submit limit reached")
	ErrState       = errors.New("pad is not in a state that allows this")
	ErrEmpty       = errors.New("pad is empty")
)

type Queue interface {
	Enqueue(ctx context.Context, id string) error
}

type Service struct {
	repo   *Repo
	grader *ai.Client
	queue  Queue
}

func NewService(repo *Repo, grader *ai.Client) *Service {
	return &Service{repo: repo, grader: grader}
}

func (s *Service) SetQueue(q Queue) { s.queue = q }

func (s *Service) Available() bool { return s.grader.Configured() }

func (s *Service) List(ctx context.Context, userID string) (List, error) {
	pads, err := s.repo.List(ctx, userID, listLimit)
	return List{Available: s.Available(), Pads: pads}, err
}

func (s *Service) Get(ctx context.Context, userID, id string) (Pad, error) {
	p, _, err := s.repo.Get(ctx, userID, id)
	return p, err
}

func (s *Service) Start(ctx context.Context, userID string, in StartInput) (Pad, error) {
	if _, ok := languages[in.Language]; !ok || in.Slug == "" {
		return Pad{}, ErrInvalid
	}
	problemID, err := s.repo.Problem(ctx, in.Slug)
	if errors.Is(err, domain.ErrNotFound) {
		return Pad{}, ErrInvalid
	}
	if err != nil {
		return Pad{}, err
	}
	first := Block{Kind: KindNote, Text: "", At: time.Now().UTC().Format(time.RFC3339)}
	id, err := s.repo.OpenDraft(ctx, userID, problemID, in.Language, first)
	if err != nil {
		return Pad{}, err
	}
	return s.Get(ctx, userID, id)
}

func (s *Service) Save(ctx context.Context, userID, id string, in SaveInput) (int, error) {
	if _, ok := languages[in.Language]; !ok || len(in.Blocks) > maxBlocks {
		return 0, ErrInvalid
	}
	size := 0
	now := time.Now().UTC()
	for i, b := range in.Blocks {
		if b.Kind != KindNote && b.Kind != KindCode {
			return 0, ErrInvalid
		}
		size += len(b.Text)
		if at, err := time.Parse(time.RFC3339, b.At); err != nil || at.After(now.Add(time.Minute)) {
			in.Blocks[i].At = now.Format(time.RFC3339)
		}
	}
	if size > maxPadBytes {
		return 0, ErrInvalid
	}
	if in.Blocks == nil {
		in.Blocks = []Block{}
	}
	version, err := s.repo.Save(ctx, userID, id, in)
	if errors.Is(err, ErrStale) {
		if _, _, err := s.repo.Get(ctx, userID, id); err != nil {
			return 0, err
		}
	}
	return version, err
}

func (s *Service) Delete(ctx context.Context, userID, id string) error {
	return s.repo.Delete(ctx, userID, id)
}

func (s *Service) Submit(ctx context.Context, userID, id string) (Pad, error) {
	if s.queue == nil || !s.Available() {
		return Pad{}, ErrUnavailable
	}
	p, _, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Pad{}, err
	}
	if !hasContent(p.Blocks) {
		return Pad{}, ErrEmpty
	}
	if p.Status == StatusDraft {
		n, err := s.repo.SubmittedSince(ctx, userID, time.Now().Add(-24*time.Hour))
		if err != nil {
			return Pad{}, err
		}
		if n >= maxSubmitsPerDay {
			return Pad{}, ErrLimit
		}
	}
	ok, err := s.repo.MarkGrading(ctx, userID, id, stuckAfter)
	if err != nil {
		return Pad{}, err
	}
	if !ok {
		return Pad{}, ErrState
	}
	if err := s.queue.Enqueue(ctx, id); err != nil {
		_ = s.repo.MarkFailed(context.Background(), id)
		return Pad{}, err
	}
	return s.Get(ctx, userID, id)
}

func hasContent(blocks []Block) bool {
	for _, b := range blocks {
		if strings.TrimSpace(b.Text) != "" {
			return true
		}
	}
	return false
}

// Grade writes the feedback. It is the grade Lambda's entry point for pads.
func (s *Service) Grade(ctx context.Context, id string) error {
	p, owner, err := s.repo.Get(ctx, "", id)
	if errors.Is(err, domain.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if p.Status != StatusGrading {
		return nil
	}
	recent, err := s.repo.Graded(ctx, owner, id, focusWindow)
	if err != nil {
		return err
	}
	history := recent
	if len(history) > historyPads {
		history = history[:historyPads]
	}
	msgs := []ai.Message{
		{Role: ai.RoleDeveloper, Content: graderRules},
		{Role: ai.RoleUser, Content: padPrompt(p, focus(recent), history)},
	}
	var out gradeOut
	for attempt := 0; attempt < gradeAttempts; attempt++ {
		if err = s.grader.RespondJSON(ctx, msgs, "feedback", feedbackSchema(), maxFeedbackTokens, &out); err == nil || ctx.Err() != nil {
			break
		}
	}
	if err != nil {
		_ = s.repo.MarkFailed(context.Background(), id)
		return err
	}
	return s.repo.SaveFeedback(ctx, id, out.feedback(len(p.Blocks)))
}

func (s *Service) Progress(ctx context.Context, userID string) (Progress, error) {
	recent, err := s.repo.Graded(ctx, userID, "", progressPads)
	if err != nil {
		return Progress{}, err
	}
	out := Progress{Focus: focus(recent), Areas: []Trend{}}
	for _, a := range areas {
		t := Trend{Area: a, Points: []Point{}}
		for i := len(recent) - 1; i >= 0; i-- {
			g := recent[i]
			for _, m := range g.Feedback.Rubric {
				if m.Area == a {
					t.Points = append(t.Points, Point{PadID: g.ID, Title: g.Title, Mark: m.Mark, At: g.At})
				}
			}
		}
		t.Trend = trend(t.Points)
		out.Areas = append(out.Areas, t)
	}
	return out, nil
}

// focus is the area marked weak most often across the given pads, or "".
func focus(recent []graded) string {
	if len(recent) > focusWindow {
		recent = recent[:focusWindow]
	}
	weak := map[string]int{}
	for _, g := range recent {
		for _, m := range g.Feedback.Rubric {
			if m.Mark == "weak" {
				weak[m.Area]++
			}
		}
	}
	best, most := "", 0
	for _, a := range areas {
		if weak[a] > most {
			best, most = a, weak[a]
		}
	}
	return best
}

// trend compares the older half of the marks with the newer half.
func trend(points []Point) string {
	if len(points) < 4 {
		return ""
	}
	half := len(points) / 2
	avg := func(ps []Point) float64 {
		sum := 0
		for _, p := range ps {
			sum += marks[p.Mark]
		}
		return float64(sum) / float64(len(ps))
	}
	switch d := avg(points[len(points)-half:]) - avg(points[:half]); {
	case d >= 0.4:
		return "improving"
	case d <= -0.4:
		return "slipping"
	}
	return "steady"
}
