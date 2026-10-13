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
	observeGap        = 60 * time.Second
	answerWindow      = 3 * time.Minute
	maxObservations   = 25
	progressCount     = 10
	historyCount      = 3
	focusWindow       = 5
	gradeAttempts     = 2
	listLimit         = 50
)

var (
	ErrUnavailable = errors.New("interviews unavailable")
	ErrInvalid     = errors.New("invalid request")
	ErrNoResume    = errors.New("no resume on file")
	ErrLimit       = errors.New("daily interview limit reached")
	ErrState       = errors.New("interview is not in a state that allows this")
	ErrTooSoon     = errors.New("checked too recently")
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
	if in.Kind == KindCoding {
		if in.Language == "" {
			in.Language = "python"
		}
		if _, ok := languages[in.Language]; !ok {
			return Interview{}, ErrInvalid
		}
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
		Subject:    strings.TrimSpace(in.Slug),
		Language:   in.Language,
	}
	if err := s.brief(ctx, u, &iv); err != nil {
		return Interview{}, err
	}

	id, err := s.repo.Create(ctx, u.ID, iv)
	if err != nil {
		return Interview{}, err
	}
	iv.ID = id

	if err := s.open(ctx, &iv); err != nil {
		_ = s.repo.Delete(context.Background(), u.ID, id)
		return Interview{}, err
	}
	return s.repo.Get(ctx, u.ID, id)
}

func (s *Service) open(ctx context.Context, iv *Interview) error {
	if iv.Kind != KindCoding {
		opening, err := s.ask(ctx, *iv, nil, "Begin the interview now.")
		if err != nil {
			return err
		}
		return s.repo.AppendTurns(ctx, iv.ID, PhaseInterview, "", "", opening, nil, false)
	}
	r, err := s.askCoding(ctx, *iv, nil, codingOpening, true)
	if err != nil {
		return err
	}
	if r.Problem == nil || strings.TrimSpace(r.Say) == "" {
		return errors.New("interview: opening had no problem")
	}
	if err := s.repo.SetProblem(ctx, iv.ID, *r.Problem); err != nil {
		return err
	}
	return s.repo.AppendTurns(ctx, iv.ID, PhaseInterview, "", "", r.Say, r.signals(), false)
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
		var p Problem
		var err error
		if iv.Subject != "" {
			p, err = s.repo.ProblemBySlug(ctx, iv.Subject)
			if errors.Is(err, domain.ErrNotFound) {
				return ErrInvalid
			}
		} else {
			p, err = s.repo.PickProblem(ctx, u.ID, iv.Difficulty)
		}
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

func (s *Service) Reply(ctx context.Context, userID, id, message, code string, version int) (Interview, error) {
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

	if iv.Kind != KindCoding {
		answer, err := s.ask(ctx, iv, iv.Turns, candidateTurn(message, code))
		if err != nil {
			return Interview{}, err
		}
		if err := s.repo.AppendTurns(ctx, id, PhaseInterview, message, code, answer, nil, false); err != nil {
			return Interview{}, err
		}
		return s.repo.Get(ctx, userID, id)
	}

	if version < iv.CodeVersion {
		return Interview{}, ErrStale
	}
	said, next := message, message
	if message == HintAsk {
		said, next = "Asked for a hint.", hintAsk
	}
	r, err := s.askCoding(ctx, iv, iv.Turns, next, false)
	if err != nil {
		return Interview{}, err
	}
	if err := s.repo.AppendTurns(ctx, id, PhaseInterview, said, "", r.Say, r.signals(), false); err != nil {
		return Interview{}, err
	}
	return s.repo.Get(ctx, userID, id)
}

// Observe is the watch check: the interviewer looks at the editor and may speak unprompted.
func (s *Service) Observe(ctx context.Context, userID, id string, version int) (Interview, error) {
	if !s.Available() {
		return Interview{}, ErrUnavailable
	}
	iv, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Interview{}, err
	}
	if iv.Kind != KindCoding || iv.Status != StatusActive {
		return Interview{}, ErrState
	}
	if version < iv.CodeVersion {
		return Interview{}, ErrStale
	}
	if awaitingAnswer(iv.Turns, time.Now()) {
		return Interview{}, ErrTooSoon
	}
	ok, err := s.repo.ClaimObservation(ctx, userID, id, observeGap, maxObservations)
	if err != nil {
		return Interview{}, err
	}
	if !ok {
		return Interview{}, ErrTooSoon
	}
	r, err := s.askCoding(ctx, iv, iv.Turns, watchCheck, false)
	if err != nil {
		return Interview{}, err
	}
	if err := s.repo.AppendTurns(ctx, id, PhaseInterview, "", "", strings.TrimSpace(r.Say), r.signals(), true); err != nil {
		return Interview{}, err
	}
	return s.repo.Get(ctx, userID, id)
}

// awaitingAnswer is true while the interviewer's last question is recent and unanswered.
func awaitingAnswer(turns []Turn, now time.Time) bool {
	if len(turns) == 0 {
		return false
	}
	last := turns[len(turns)-1]
	at, err := time.Parse(time.RFC3339, last.At)
	return last.Role == "assistant" && err == nil && now.Sub(at) < answerWindow
}

func (s *Service) SaveCode(ctx context.Context, userID, id string, in CodeInput) (int, error) {
	if _, ok := languages[in.Language]; !ok || len(in.Code) > maxCodeBytes {
		return 0, ErrInvalid
	}
	version, err := s.repo.SaveCode(ctx, userID, id, in)
	if errors.Is(err, ErrStale) {
		if _, err := s.repo.Get(ctx, userID, id); err != nil {
			return 0, err
		}
	}
	return version, err
}

func (s *Service) askCoding(ctx context.Context, iv Interview, history []Turn, next string, opening bool) (codingReply, error) {
	msgs := []ai.Message{{Role: ai.RoleDeveloper, Content: interviewerPrompt(iv)}}
	for _, t := range history {
		if t.Role == "user" {
			msgs = append(msgs, ai.Message{Role: ai.RoleUser, Content: candidateTurn(t.Content, t.Code)})
		} else if t.Content != "" {
			msgs = append(msgs, ai.Message{Role: ai.RoleAssistant, Content: t.Content})
		}
	}
	msgs = append(msgs,
		ai.Message{Role: ai.RoleDeveloper, Content: clock(iv)},
		ai.Message{Role: ai.RoleDeveloper, Content: codeView(iv)},
		ai.Message{Role: ai.RoleDeveloper, Content: turnRule},
		ai.Message{Role: ai.RoleUser, Content: next})

	ctx, cancel := context.WithTimeout(ctx, turnTimeout)
	defer cancel()
	var r codingReply
	err := s.interviewer.RespondJSON(ctx, msgs, "turn", replySchema(opening), maxTurnTokens, &r)
	return r, err
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

	var d Debrief
	if iv.Kind == KindCoding {
		d, err = s.gradeCoding(ctx, iv)
	} else {
		msgs := []ai.Message{
			{Role: ai.RoleDeveloper, Content: graderPrompt(iv)},
			{Role: ai.RoleUser, Content: transcript(iv)},
		}
		for attempt := 0; attempt < gradeAttempts; attempt++ {
			if err = s.grader.RespondJSON(ctx, msgs, "debrief", debriefSchema, maxDebriefTokens, &d); err == nil || ctx.Err() != nil {
				break
			}
		}
	}
	if err != nil {
		_ = s.repo.MarkFailed(context.Background(), id)
		return err
	}
	return s.repo.SaveDebrief(ctx, id, d)
}

func (s *Service) gradeCoding(ctx context.Context, iv Interview) (Debrief, error) {
	owner, err := s.repo.Owner(ctx, iv.ID)
	if err != nil {
		return Debrief{}, err
	}
	recent, err := s.repo.GradedCoding(ctx, owner, iv.ID, focusWindow)
	if err != nil {
		return Debrief{}, err
	}
	history := recent
	if len(history) > historyCount {
		history = history[:historyCount]
	}
	msgs := []ai.Message{
		{Role: ai.RoleDeveloper, Content: codingGraderPrompt(iv, focus(recent), history)},
		{Role: ai.RoleUser, Content: codingMaterial(iv)},
	}
	var c codingDebrief
	for attempt := 0; attempt < gradeAttempts; attempt++ {
		if err = s.grader.RespondJSON(ctx, msgs, "debrief", codingDebriefSchema(), maxDebriefTokens, &c); err == nil || ctx.Err() != nil {
			break
		}
	}
	return c.debrief(), err
}

// Progress is the six coding areas across the member's recent graded coding interviews.
func (s *Service) Progress(ctx context.Context, userID string) (Progress, error) {
	recent, err := s.repo.GradedCoding(ctx, userID, "", progressCount)
	if err != nil {
		return Progress{}, err
	}
	window := recent
	if len(window) > focusWindow {
		window = window[:focusWindow]
	}
	out := Progress{Focus: focus(window), Areas: []Trend{}}
	for _, a := range areas {
		t := Trend{Area: a, Points: []Point{}}
		for i := len(recent) - 1; i >= 0; i-- {
			for _, m := range recent[i].Debrief.Rubric {
				if m.Area == a {
					t.Points = append(t.Points, Point{InterviewID: recent[i].ID, Title: recent[i].Title, Mark: m.Mark, At: recent[i].At})
				}
			}
		}
		t.Trend = trend(t.Points)
		out.Areas = append(out.Areas, t)
	}
	return out, nil
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
	if err := s.repo.AppendTurns(ctx, id, PhaseFollowup, message, "", answer, nil, false); err != nil {
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
