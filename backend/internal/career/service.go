package career

import (
	"context"
	"errors"
	"strings"

	"kronos/internal/domain"
	"kronos/internal/platform/httpx"
)

// Size ceilings. A resume past maxResumeBytes or a posting past maxJobBytes is
// a paste accident, not a document, and storing it would crowd out everything
// else in the coach's context window.
const (
	maxResumeBytes = 200 * 1024
	maxJobBytes    = 100 * 1024
	maxLabelBytes  = 120
)

// ErrInvalid is any payload the service refuses before it reaches the database.
var ErrInvalid = errors.New("invalid input")

// Service owns the member's career documents: resumes and the roles they are
// applying to. It validates and normalises; the coach reads what it stores.
type Service struct {
	repo *Repo
}

func NewService(repo *Repo) *Service { return &Service{repo: repo} }

func (s *Service) Resumes(ctx context.Context, userID string) ([]Resume, error) {
	return s.repo.Resumes(ctx, userID)
}

func (s *Service) Resume(ctx context.Context, userID, id string) (Resume, error) {
	return s.repo.Resume(ctx, userID, id)
}

// SaveResume stores a pasted resume. An empty id creates; the first resume a
// member stores becomes their primary.
func (s *Service) SaveResume(ctx context.Context, userID, id, label, content string) (string, error) {
	content = strings.TrimSpace(content)
	label = strings.TrimSpace(label)
	if label == "" {
		label = "Resume"
	}
	if content == "" || len(content) > maxResumeBytes || len(label) > maxLabelBytes {
		return "", ErrInvalid
	}
	if id != "" && !httpx.IsUUID(id) {
		return "", ErrInvalid
	}
	return s.repo.SaveResume(ctx, userID, id, label, content)
}

func (s *Service) SetPrimaryResume(ctx context.Context, userID, id string) error {
	return s.repo.SetPrimaryResume(ctx, userID, id)
}

func (s *Service) DeleteResume(ctx context.Context, userID, id string) error {
	return s.repo.DeleteResume(ctx, userID, id)
}

func (s *Service) Jobs(ctx context.Context, userID string) ([]Job, error) {
	return s.repo.Jobs(ctx, userID)
}

func (s *Service) Job(ctx context.Context, userID, id string) (Job, error) {
	return s.repo.Job(ctx, userID, id)
}

// SaveJob stores a listing. Company and title are the identity of a row, so
// both are required; everything else is optional context for the coach.
func (s *Service) SaveJob(ctx context.Context, userID string, j Job) (string, error) {
	j.Company = strings.TrimSpace(j.Company)
	j.Title = strings.TrimSpace(j.Title)
	j.Location = strings.TrimSpace(j.Location)
	j.URL = strings.TrimSpace(j.URL)
	j.Description = strings.TrimSpace(j.Description)
	if j.Status == "" {
		j.Status = "saved"
	}
	if j.Company == "" || j.Title == "" || !validStatus(j.Status) {
		return "", ErrInvalid
	}
	if len(j.Description) > maxJobBytes || len(j.Company) > maxLabelBytes || len(j.Title) > maxLabelBytes {
		return "", ErrInvalid
	}
	if j.ID != "" && !httpx.IsUUID(j.ID) {
		return "", ErrInvalid
	}
	return s.repo.SaveJob(ctx, userID, j)
}

func (s *Service) DeleteJob(ctx context.Context, userID, id string) error {
	return s.repo.DeleteJob(ctx, userID, id)
}

// NotFound reports whether err is a missing document, so the controller can
// answer 404 without knowing the repository's error vocabulary.
func NotFound(err error) bool { return errors.Is(err, domain.ErrNotFound) }
