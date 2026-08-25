package admin

import (
	"context"
	"strings"

	"kronos/internal/config"
	"kronos/internal/domain"
	"kronos/internal/user"
)

// sessionExpiryKey is where the LeetCode session's expiry date is recorded.
// The token itself never lands here - see SaveSession.
const sessionExpiryKey = "leetcode_session_expires_at"

// Service backs the admin console: membership review, instance analytics, and
// the LeetCode session credential that the sync pipeline depends on.
type Service struct {
	repo *Repo
	// users handles username assignment, so the uniqueness rule lives in one
	// place whether a member or an admin performs the change.
	users *user.Repo
}

func NewService(repo *Repo, userRepo *user.Repo) *Service {
	return &Service{repo: repo, users: userRepo}
}

func (s *Service) Pending(ctx context.Context) ([]domain.User, error) {
	return s.repo.ListPending(ctx)
}

func (s *Service) AllUsers(ctx context.Context) ([]domain.User, error) {
	return s.repo.AllUsers(ctx)
}

func (s *Service) Analytics(ctx context.Context) (Analytics, error) {
	return s.repo.Analytics(ctx)
}

func (s *Service) Approve(ctx context.Context, userID string) error {
	return s.repo.Approve(ctx, userID)
}

// SetUsername assigns a member's LeetCode handle, surfacing collisions as
// domain.ErrUsernameTaken.
func (s *Service) SetUsername(ctx context.Context, userID, username string) error {
	return s.users.SetUsername(ctx, userID, username)
}

// DeleteUser deactivates a member but keeps their history.
func (s *Service) DeleteUser(ctx context.Context, userID string) error {
	return s.repo.DeleteUser(ctx, userID)
}

// PurgeUser removes a member and everything they produced. Irreversible.
func (s *Service) PurgeUser(ctx context.Context, userID string) error {
	return s.repo.PurgeUser(ctx, userID)
}

// SessionStatus reports when the stored LeetCode session expires and whether a
// token is currently configured. The token value itself is never returned.
func (s *Service) SessionStatus(ctx context.Context) (SessionStatus, error) {
	expires, err := s.repo.GetSetting(ctx, sessionExpiryKey)
	if err != nil {
		return SessionStatus{}, err
	}
	return SessionStatus{
		ExpiresAt: expires,
		HasToken:  config.Get(ctx, "LEETCODE_SESSION") != "",
	}, nil
}

// SaveSession stores a refreshed LeetCode session. The secret goes to SSM as a
// SecureString and never to the database; only the expiry date is persisted
// locally, so the admin UI can warn before sync breaks.
func (s *Service) SaveSession(ctx context.Context, in SessionUpdate) error {
	if token := strings.TrimSpace(in.Token); token != "" {
		if err := config.Put(ctx, "LEETCODE_SESSION", token); err != nil {
			return err
		}
	}
	return s.repo.SetSetting(ctx, sessionExpiryKey, strings.TrimSpace(in.ExpiresAt))
}
