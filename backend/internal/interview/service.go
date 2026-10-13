package interview

import (
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"strings"
	"time"

	"kronos/internal/career"
	"kronos/internal/domain"
	"kronos/internal/platform/ai"
)

const (
	maxPerDay         = 6
	maxTurns          = 80
	maxFollowups      = 30
	maxMessageBytes   = 8000
	maxCodeBytes      = 20000
	maxTargetBytes    = 200
	maxResumeBytes    = 20000
	maxTurnTokens     = 2500
	maxFollowupTokens = 3000
	maxDebriefTokens  = 16000
	turnTimeout       = 25 * time.Second
	gradeAttempts     = 2
	listLimit         = 50
)

var (
	ErrUnavailable = errors.New("interviews unavailable")
	ErrInvalid     = errors.New("invalid request")
	ErrNoResume    = errors.New("no resume on file")
	ErrLimit       = errors.New("daily interview limit reached")
	ErrState       = errors.New("interview is not in a state that allows this")
)

// Queue hands a finished interview to the grader. Grading takes longer than
// the API gateway allows, so production runs it on its own Lambda.
type Queue interface {
	Enqueue(ctx context.Context, id string) error
}

type Service struct {
	repo        *Repo
	career      *career.Repo
	interviewer *ai.Client
	grader      *ai.Client
	queue       Queue
}

func NewService(repo *Repo, careerRepo *career.Repo, interviewer, grader *ai.Client) *Service {
	return &Service{repo: repo, career: careerRepo, interviewer: interviewer, grader: grader}
}

func (s *Service) SetQueue(q Queue) { s.queue = q }

func (s *Service) Available() bool { return s.interviewer.Configured() && s.grader.Configured() }

func (s *Service) List(ctx context.Context, userID string) (List, error) {
	items, err := s.repo.List(ctx, userID, listLimit)
	return List{Available: s.Available(), Interviews: items}, err
}

func (s *Service) Get(ctx context.Context, userID, id string) (Interview, error) {
	return s.repo.Get(ctx, userID, id)
}

func (s *Service) Start(ctx context.Context, u domain.User, in StartInput) (Interview, error) {
	if !s.Available() {
		return Interview{}, ErrUnavailable
	}
	minutes, ok := minutesFor[in.Kind]
	if !ok {
		return Interview{}, ErrInvalid
	}
	if in.Bar == "" {
		in.Bar = "top"
	}
	if _, ok := bars[in.Bar]; !ok {
		return Interview{}, ErrInvalid
	}
	if in.Difficulty == "" {
		in.Difficulty = "Medium"
	}
	if in.Difficulty != "Easy" && in.Difficulty != "Medium" && in.Difficulty != "Hard" {
		return Interview{}, ErrInvalid
	}
	in.Target = strings.TrimSpace(in.Target)
	if len(in.Target) > maxTargetBytes {
		return Interview{}, ErrInvalid
	}

	n, err := s.repo.StartedSince(ctx, u.ID, time.Now().Add(-24*time.Hour))
	if err != nil {
		return Interview{}, err
	}
	if n >= maxPerDay {
		return Interview{}, ErrLimit
	}

	iv := Interview{
		Summary:    Summary{Kind: in.Kind, Bar: in.Bar},
		Difficulty: in.Difficulty,
		Target:     in.Target,
		Minutes:    minutes,
	}
	if err := s.brief(ctx, u, &iv); err != nil {
		return Interview{}, err
	}

	id, err := s.repo.Create(ctx, u.ID, iv)
	if err != nil {
		return Interview{}, err
	}
	iv.ID = id

	opening, err := s.ask(ctx, iv, nil, "Begin the interview now.")
	if err != nil {
		_ = s.repo.Delete(context.Background(), u.ID, id)
		return Interview{}, err
	}
	if err := s.repo.AppendTurns(ctx, id, PhaseInterview, "", "", opening); err != nil {
		return Interview{}, err
	}
	return s.repo.Get(ctx, u.ID, id)
}

func (s *Service) brief(ctx context.Context, u domain.User, iv *Interview) error {
	switch iv.Kind {
	case KindResume, KindBehavioral:
		r, err := s.career.PrimaryResume(ctx, u.ID)
		if errors.Is(err, domain.ErrNotFound) {
			if iv.Kind == KindResume {
				return ErrNoResume
			}
			iv.Title = "Behavioral"
			return nil
		}
		if err != nil {
			return err
		}
		iv.Subject = r.ID
		iv.Title = "Resume: " + r.Label
		if iv.Kind == KindBehavioral {
			iv.Title = "Behavioral"
		}
		iv.Briefing = "RESUME\n" + truncate(r.Content, maxResumeBytes)
	case KindCoding:
		p, err := s.repo.PickProblem(ctx, u.ID, iv.Difficulty)
		if err != nil {
			return err
		}
		iv.Subject, iv.Title = p.Slug, p.Title
		iv.Difficulty = p.Difficulty
	case KindDesign:
		used, err := s.repo.UsedSubjects(ctx, u.ID, KindDesign)
		if err != nil {
			return err
		}
		fresh := designPrompts[:0:0]
		for _, d := range designPrompts {
			if !used[d.Slug] {
				fresh = append(fresh, d)
			}
		}
		if len(fresh) == 0 {
			fresh = designPrompts
		}
		d := fresh[rand.IntN(len(fresh))]
		iv.Subject, iv.Title = d.Slug, d.Title
	}
	return nil
}

func (s *Service) Reply(ctx context.Context, userID, id, message, code string) (Interview, error) {
	message, code = strings.TrimSpace(message), strings.TrimSpace(code)
	if (message == "" && code == "") || len(message) > maxMessageBytes || len(code) > maxCodeBytes {
		return Interview{}, ErrInvalid
	}
	if !s.Available() {
		return Interview{}, ErrUnavailable
	}
	iv, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Interview{}, err
	}
	if iv.Status != StatusActive {
		return Interview{}, ErrState
	}
	if len(iv.Turns) >= maxTurns {
		return Interview{}, ErrLimit
	}

	answer, err := s.ask(ctx, iv, iv.Turns, candidateTurn(message, code))
	if err != nil {
		return Interview{}, err
	}
	if err := s.repo.AppendTurns(ctx, id, PhaseInterview, message, code, answer); err != nil {
		return Interview{}, err
	}
	return s.repo.Get(ctx, userID, id)
}

func (s *Service) ask(ctx context.Context, iv Interview, history []Turn, next string) (string, error) {
	msgs := []ai.Message{{Role: ai.RoleDeveloper, Content: interviewerPrompt(iv)}}
	for _, t := range history {
		if t.Role == "user" {
			msgs = append(msgs, ai.Message{Role: ai.RoleUser, Content: candidateTurn(t.Content, t.Code)})
		} else {
			msgs = append(msgs, ai.Message{Role: ai.RoleAssistant, Content: t.Content})
		}
	}
	msgs = append(msgs,
		ai.Message{Role: ai.RoleDeveloper, Content: clock(iv)},
		ai.Message{Role: ai.RoleUser, Content: next})

	ctx, cancel := context.WithTimeout(ctx, turnTimeout)
	defer cancel()
	return s.interviewer.Respond(ctx, msgs, maxTurnTokens)
}

func candidateTurn(message, code string) string {
	if code == "" {
		return message
	}
	return fmt.Sprintf("%s\n\n[shared code]\n```\n%s\n```", message, code)
}

// End stops the clock and queues grading. Calling it on a failed interview
// retries the grade.
func (s *Service) End(ctx context.Context, userID, id string) (Interview, error) {
	if s.queue == nil || !s.Available() {
		return Interview{}, ErrUnavailable
	}
	ok, err := s.repo.MarkGrading(ctx, userID, id)
	if err != nil {
		return Interview{}, err
	}
	if !ok {
		if _, err := s.repo.Get(ctx, userID, id); err != nil {
			return Interview{}, err
		}
		return Interview{}, ErrState
	}
	if err := s.queue.Enqueue(ctx, id); err != nil {
		_ = s.repo.MarkFailed(context.Background(), id)
		return Interview{}, err
	}
	return s.repo.Get(ctx, userID, id)
}

// Grade writes the debrief. It is the grader Lambda's entry point.
func (s *Service) Grade(ctx context.Context, id string) error {
	iv, err := s.repo.Get(ctx, "", id)
	if err != nil {
		return err
	}
	if iv.Status != StatusGrading {
		return nil
	}

	msgs := []ai.Message{
		{Role: ai.RoleDeveloper, Content: graderPrompt(iv)},
		{Role: ai.RoleUser, Content: transcript(iv)},
	}
	var d Debrief
	for attempt := 0; attempt < gradeAttempts; attempt++ {
		if err = s.grader.RespondJSON(ctx, msgs, "debrief", debriefSchema, maxDebriefTokens, &d); err == nil || ctx.Err() != nil {
			break
		}
	}
	if err != nil {
		_ = s.repo.MarkFailed(context.Background(), id)
		return err
	}
	return s.repo.SaveDebrief(ctx, id, d)
}

func (s *Service) Followup(ctx context.Context, userID, id, message string) (Interview, error) {
	message = strings.TrimSpace(message)
	if message == "" || len(message) > maxMessageBytes {
		return Interview{}, ErrInvalid
	}
	if !s.Available() {
		return Interview{}, ErrUnavailable
	}
	iv, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Interview{}, err
	}
	if iv.Status != StatusGraded {
		return Interview{}, ErrState
	}
	if len(iv.Followups) >= maxFollowups*2 {
		return Interview{}, ErrLimit
	}

	msgs := []ai.Message{
		{Role: ai.RoleDeveloper, Content: followupRules},
		{Role: ai.RoleDeveloper, Content: followupContext(iv)},
	}
	for _, t := range iv.Followups {
		role := ai.RoleAssistant
		if t.Role == "user" {
			role = ai.RoleUser
		}
		msgs = append(msgs, ai.Message{Role: role, Content: t.Content})
	}
	msgs = append(msgs, ai.Message{Role: ai.RoleUser, Content: message})

	ctx, cancel := context.WithTimeout(ctx, turnTimeout)
	defer cancel()
	answer, err := s.interviewer.Respond(ctx, msgs, maxFollowupTokens)
	if err != nil {
		return Interview{}, err
	}
	if err := s.repo.AppendTurns(ctx, id, PhaseFollowup, message, "", answer); err != nil {
		return Interview{}, err
	}
	return s.repo.Get(ctx, userID, id)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "\n… (truncated)"
}
