package progress

import (
	"context"

	"kronos/internal/domain"
)

// Service exposes LeetCode progress reads. These are genuinely thin - the work
// is in SQL - so the methods delegate. They exist so controllers depend on a
// service in every feature, and so caching or scoping rules have an obvious
// home if they are ever needed.
type Service struct {
	repo *Repo
}

func NewService(repo *Repo) *Service { return &Service{repo: repo} }

const (
	leaderboardLimit = 100
	recentLimit      = 25
)

func (s *Service) Leaderboard(ctx context.Context) ([]LeaderRow, error) {
	return s.repo.Leaderboard(ctx, leaderboardLimit)
}

func (s *Service) Recent(ctx context.Context) ([]RecentRow, error) {
	return s.repo.Recent(ctx, recentLimit)
}

func (s *Service) Progress(ctx context.Context, userID string) ([]ProblemRow, error) {
	return s.repo.Progress(ctx, userID)
}

func (s *Service) Calendar(ctx context.Context, userID string) ([]domain.DayCount, error) {
	return s.repo.Calendar(ctx, userID)
}

func (s *Service) CalendarProblems(ctx context.Context, userID string) ([]CalendarProblem, error) {
	return s.repo.CalendarProblems(ctx, userID)
}

func (s *Service) GroupDifficulty(ctx context.Context) ([]DifficultyTotal, error) {
	return s.repo.GroupDifficulty(ctx)
}

func (s *Service) CircleDifficulty(ctx context.Context, userID string) ([]DifficultyTotal, error) {
	return s.repo.CircleDifficulty(ctx, userID)
}

// MySolution returns the caller's own stored solutions for a problem. No
// authorization check is needed - the owner is the caller.
func (s *Service) MySolution(ctx context.Context, userID, slug string, recent bool) ([]SolutionRow, error) {
	return s.repo.Solutions(ctx, userID, slug, recent)
}
