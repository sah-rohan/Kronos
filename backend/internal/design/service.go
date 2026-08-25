package design

import (
	"context"
	"errors"
)

// maxDesignBytes bounds a stored canvas. A design past this size is a client
// bug, not a real submission, and storing it would bloat the AI context that
// later reads it back.
const maxDesignBytes = 32 * 1024

const (
	leaderboardLimit = 100
	activityLimit    = 50
)

// ErrBadDesign is a malformed or oversized canvas payload.
var ErrBadDesign = errors.New("bad design payload")

// Service owns System Design and GenAI module progress: what a member solved,
// what they drew, and how the group ranks.
type Service struct {
	repo *Repo
}

func NewService(repo *Repo) *Service { return &Service{repo: repo} }

func (s *Service) Solved(ctx context.Context, userID string) ([]string, error) {
	return s.repo.SDSolved(ctx, userID)
}

func (s *Service) RecordSolve(ctx context.Context, userID, slug string) error {
	return s.repo.RecordSDSolve(ctx, userID, slug)
}

func (s *Service) MyActivity(ctx context.Context, userID string) ([]SDActivityRow, error) {
	return s.repo.MySDActivity(ctx, userID)
}

func (s *Service) Activity(ctx context.Context, kind string) ([]SDActivityRow, error) {
	return s.repo.SDActivity(ctx, activityLimit, kind)
}

func (s *Service) Leaderboard(ctx context.Context, kind string) ([]SDLeaderRow, error) {
	return s.repo.SDLeaderboard(ctx, leaderboardLimit, kind)
}

// SaveAttempt persists what the member actually built on the canvas, rejecting
// empty or oversized payloads before they reach the database.
func (s *Service) SaveAttempt(ctx context.Context, userID, slug, designJSON string, ok bool) error {
	if designJSON == "" || len(designJSON) > maxDesignBytes {
		return ErrBadDesign
	}
	return s.repo.SaveSDAttempt(ctx, userID, slug, designJSON, ok)
}
