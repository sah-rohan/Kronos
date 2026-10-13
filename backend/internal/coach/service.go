package coach

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"kronos/internal/career"
	"kronos/internal/domain"
	"kronos/internal/platform/ai"
	"kronos/internal/platform/httpx"
)

// The context budget. A gpt-5 deployment would take far more, but every
// character is paid for on every turn, so the evidence is ranked and capped
// rather than sent whole: the full solved list is small and always worth it,
// the code is large and only the most recent (plus anything the question names)
// earns a place.
const (
	maxSolutions     = 14
	maxSolutionBytes = 2500
	maxResumeBytes   = 20000
	maxJobBytes      = 12000
	maxHistoryTurns  = 12
	maxQuestionBytes = 8000
	maxReplyTokens   = 6000
	maxPerDay        = 40
)

// ErrUnavailable is returned when no Azure OpenAI deployment is configured, so
// the controller can answer 503 instead of a generic failure.
var ErrUnavailable = errors.New("coach unavailable")

// ErrInvalid is an empty or oversized question, or a job id that is not one.
var ErrInvalid = errors.New("invalid question")

var ErrLimit = errors.New("daily coach limit reached")

// Service answers questions about a member's own interview preparation. It
// owns the prompt: what evidence to gather, how to rank it, and how to frame
// it. The ai package knows none of that, and the repos know none of it either.
type Service struct {
	repo   *Repo
	career *career.Repo
	model  *ai.Client
}

func NewService(repo *Repo, careerRepo *career.Repo, model *ai.Client) *Service {
	return &Service{repo: repo, career: careerRepo, model: model}
}

// Available reports whether the deployment was wired at startup.
func (s *Service) Available() bool { return s.model.Configured() }

func (s *Service) History(ctx context.Context, userID, jobID string) ([]Turn, error) {
	if !validThread(jobID) {
		return nil, ErrInvalid
	}
	return s.repo.History(ctx, userID, jobID, maxHistoryTurns*2)
}

func (s *Service) Clear(ctx context.Context, userID, jobID string) error {
	if !validThread(jobID) {
		return ErrInvalid
	}
	return s.repo.ClearHistory(ctx, userID, jobID)
}

// validThread accepts the general-prep thread (no job) or a well-formed job id.
// Anything else would reach Postgres as a bad uuid cast.
func validThread(jobID string) bool { return jobID == "" || httpx.IsUUID(jobID) }

// Context is the assembled evidence, returned verbatim so a member can see
// exactly what the model was told about them before they trust its answer.
func (s *Service) Context(ctx context.Context, u domain.User, jobID, question string) (string, Reply, error) {
	if !validThread(jobID) {
		return "", Reply{}, ErrInvalid
	}
	return s.build(ctx, u, jobID, question)
}

// Chat answers one question with the member's own record as evidence, then
// stores both turns so the next question continues the thread.
func (s *Service) Chat(ctx context.Context, u domain.User, jobID, question string) (Reply, error) {
	question = strings.TrimSpace(question)
	if question == "" || len(question) > maxQuestionBytes || !validThread(jobID) {
		return Reply{}, ErrInvalid
	}
	if !s.Available() {
		return Reply{}, ErrUnavailable
	}
	asked, err := s.repo.AskedSince(ctx, u.ID, time.Now().Add(-24*time.Hour))
	if err != nil {
		return Reply{}, err
	}
	if asked >= maxPerDay {
		return Reply{}, ErrLimit
	}

	evidence, meta, err := s.build(ctx, u, jobID, question)
	if err != nil {
		return Reply{}, err
	}

	history, err := s.repo.History(ctx, u.ID, jobID, maxHistoryTurns)
	if err != nil {
		return Reply{}, err
	}

	msgs := []ai.Message{
		{Role: ai.RoleDeveloper, Content: systemPrompt},
		{Role: ai.RoleDeveloper, Content: evidence},
	}
	for _, t := range history {
		role := ai.RoleUser
		if t.Role == "assistant" {
			role = ai.RoleAssistant
		}
		msgs = append(msgs, ai.Message{Role: role, Content: t.Content})
	}
	msgs = append(msgs, ai.Message{Role: ai.RoleUser, Content: question})

	answer, err := s.model.Respond(ctx, msgs, maxReplyTokens)
	if err != nil {
		return Reply{}, err
	}

	if err := s.repo.AppendTurns(ctx, u.ID, jobID, question, answer); err != nil {
		return Reply{}, err
	}
	meta.Reply = answer
	return meta, nil
}

// systemPrompt frames the model as a coach reading a specific person's record.
// The instruction that matters most is the last one: this member's own code is
// in the context, so advice that ignores it is worse than no advice.
const systemPrompt = `You are the interview coach inside Kronos, a LeetCode and system-design
progress tracker. You are advising one specific engineer, and everything you need to know about
them is in the context that follows: the problems they have solved, the code they actually wrote,
the system-design modules they finished, their resume, and the roles they are applying to.

How to answer:
- Ground every claim in their record. Cite the problem, the module, or the resume line you are
  reasoning from. If the record does not support a claim, say so rather than inventing one.
- Never recommend a problem they have already solved unless you are asking them to redo it for a
  named reason - a better complexity, a different pattern, a language they are weak in.
- When you critique their code, quote the specific lines and name the complexity. Be direct about
  what is wrong; they are here to get better, not to be reassured.
- When a target role is given, tie your advice to that posting: the patterns it implies, the gaps
  between it and their resume, the stories they should be ready to tell.
- Be concise and concrete. Prefer a short ranked list over prose. No preamble.`

// build gathers the evidence and renders it as the context block, returning
// alongside it the counts the UI shows so a member can see what was read.
func (s *Service) build(ctx context.Context, u domain.User, jobID, question string) (string, Reply, error) {
	var meta Reply
	var b strings.Builder

	fmt.Fprintf(&b, "MEMBER\n%s", u.DisplayName)
	if u.LeetcodeUser != "" {
		fmt.Fprintf(&b, " (LeetCode: %s)", u.LeetcodeUser)
	}
	b.WriteString("\n\n")

	counts, err := s.repo.Counts(ctx, u.ID)
	if err != nil {
		return "", meta, err
	}
	fmt.Fprintf(&b, "PROGRESS THIS SEASON\n%d solved - %d easy, %d medium, %d hard. "+
		"Blind 75: %d/75. NeetCode 150: %d/150. NeetCode 250: %d/250.\n\n",
		counts.Total, counts.Easy, counts.Medium, counts.Hard,
		counts.Blind75, counts.Neetcode150, counts.Neetcode250)

	solved, err := s.repo.SolvedList(ctx, u.ID)
	if err != nil {
		return "", meta, err
	}
	meta.Solved = len(solved)
	if len(solved) == 0 {
		b.WriteString("SOLVED PROBLEMS\nNone yet this season.\n\n")
	} else {
		b.WriteString("SOLVED PROBLEMS (every one, newest first)\n")
		for _, p := range solved {
			fmt.Fprintf(&b, "- %s [%s, %s] solved %s\n", p.Title, p.Difficulty, p.Category, p.At)
		}
		b.WriteString("\n")
	}

	solutions, err := s.repo.Solutions(ctx, u.ID, maxSolutions)
	if err != nil {
		return "", meta, err
	}
	if named, err := s.repo.SolutionsFor(ctx, u.ID, mentioned(question, solved)); err == nil {
		solutions = merge(named, solutions)
	}
	meta.Code = len(solutions)
	if len(solutions) > 0 {
		b.WriteString("THEIR OWN ACCEPTED CODE\n")
		for _, sol := range solutions {
			fmt.Fprintf(&b, "\n--- %s [%s] %s, solved %s, beats %.0f%% on runtime, optimal=%t\n```%s\n%s\n```\n",
				sol.Title, sol.Difficulty, sol.Lang, sol.At, sol.RuntimePct, sol.Optimal,
				strings.ToLower(sol.Lang), truncate(sol.Code, maxSolutionBytes))
		}
		b.WriteString("\n")
	}

	if modules, err := s.repo.Modules(ctx, u.ID); err == nil && len(modules) > 0 {
		fmt.Fprintf(&b, "SYSTEM DESIGN / GENAI MODULES COMPLETED\n%s\n\n", strings.Join(modules, ", "))
	}

	resume, err := s.career.PrimaryResume(ctx, u.ID)
	switch {
	case err == nil:
		meta.Resume = resume.Label
		fmt.Fprintf(&b, "RESUME (%s)\n%s\n\n", resume.Label, truncate(resume.Content, maxResumeBytes))
	case errors.Is(err, domain.ErrNotFound):
		b.WriteString("RESUME\nNone on file. If resume advice is asked for, say it is missing.\n\n")
	default:
		return "", meta, err
	}

	if jobID != "" {
		job, err := s.career.Job(ctx, u.ID, jobID)
		if err != nil && !errors.Is(err, domain.ErrNotFound) {
			return "", meta, err
		}
		if err == nil {
			meta.Job = job.Company + " - " + job.Title
			fmt.Fprintf(&b, "TARGET ROLE\n%s - %s", job.Company, job.Title)
			if job.Location != "" {
				fmt.Fprintf(&b, " (%s)", job.Location)
			}
			fmt.Fprintf(&b, "\nStatus: %s\n", job.Status)
			if job.URL != "" {
				fmt.Fprintf(&b, "Link: %s\n", job.URL)
			}
			if job.Description != "" {
				fmt.Fprintf(&b, "\nPosting:\n%s\n", truncate(job.Description, maxJobBytes))
			}
			b.WriteString("\n")
		}
	}

	if jobs, err := s.career.Jobs(ctx, u.ID); err == nil && len(jobs) > 0 {
		b.WriteString("APPLICATION PIPELINE\n")
		for _, j := range jobs {
			fmt.Fprintf(&b, "- %s - %s [%s]\n", j.Company, j.Title, j.Status)
		}
		b.WriteString("\n")
	}

	return b.String(), meta, nil
}

// mentioned returns the slugs of problems the question names, by title or by
// slug, so asking "why was my two sum slow" carries that code even when the
// problem is old enough to have fallen out of the recent window.
func mentioned(question string, solved []Solved) []string {
	if question == "" {
		return nil
	}
	q := strings.ToLower(question)
	var out []string
	for _, p := range solved {
		if strings.Contains(q, strings.ToLower(p.Title)) || strings.Contains(q, p.Slug) {
			out = append(out, p.Slug)
		}
		if len(out) == 4 {
			break
		}
	}
	return out
}

// merge puts the named solutions first and drops the duplicates they create,
// keeping the combined list within the same budget as the recent window.
func merge(named, recent []Solution) []Solution {
	seen := make(map[string]bool, len(named))
	out := make([]Solution, 0, maxSolutions)
	for _, s := range append(named, recent...) {
		if seen[s.Slug] {
			continue
		}
		seen[s.Slug] = true
		out = append(out, s)
		if len(out) == maxSolutions {
			break
		}
	}
	return out
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "\n… (truncated)"
}
