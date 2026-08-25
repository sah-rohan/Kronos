package user

import (
	"context"
	"strings"

	"kronos/internal/domain"
)

// Service owns identity rules: who gets bootstrapped as admin, what a valid
// profile edit looks like, and which username changes apply immediately versus
// needing review.
type Service struct {
	repo *Repo
	// adminClerkID is the one Clerk subject promoted to admin automatically,
	// so a fresh deploy has an operator without a manual DB edit.
	adminClerkID string
}

func NewService(repo *Repo, adminClerkID string) *Service {
	return &Service{repo: repo, adminClerkID: adminClerkID}
}

// Authenticate resolves the Clerk subject to a stored user, creating the row on
// first sign-in and promoting the configured operator to admin. Every request
// passes through here, so it is the single place identity is established.
func (s *Service) Authenticate(ctx context.Context, clerkID, displayName, email string) (domain.User, error) {
	u, err := s.repo.EnsureUser(ctx, clerkID, displayName, email)
	if err != nil {
		return domain.User{}, err
	}
	if s.adminClerkID != "" && clerkID == s.adminClerkID && (!u.IsAdmin() || !u.Approved()) {
		// Best-effort: if the promotion write fails the request still proceeds
		// as a normal member rather than 500-ing on an unrelated concern.
		if err := s.repo.MakeAdmin(ctx, u.ID); err == nil {
			u.Role, u.Status = "admin", "approved"
		}
	}
	return u, nil
}

// UpdateProfile sets the member's LeetCode and GitHub handles, surfacing a
// taken username as domain.ErrUsernameTaken for the controller to map to 409.
func (s *Service) UpdateProfile(ctx context.Context, userID string, in ProfileUpdate) error {
	return s.repo.SetProfile(ctx, userID, strings.TrimSpace(in.Username), strings.TrimSpace(in.Github))
}

// RequestUsername files a username change for admin review. An empty username
// is rejected here rather than reaching SQL.
func (s *Service) RequestUsername(ctx context.Context, userID string, in UsernameRequest) error {
	name := strings.TrimSpace(in.Username)
	if name == "" {
		return ErrUsernameRequired
	}
	return s.repo.RequestUsername(ctx, userID, name)
}

func (s *Service) SetTheme(ctx context.Context, userID, theme string) error {
	return s.repo.SetTheme(ctx, userID, theme)
}

func (s *Service) RecordVisit(ctx context.Context, userID string) error {
	return s.repo.RecordVisit(ctx, userID)
}
