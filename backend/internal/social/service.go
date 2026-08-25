package social

import (
	"context"

	"kronos/internal/domain"
	"kronos/internal/progress"
)

// Service owns the friend graph and, with it, the authorization rule that
// makes the graph mean something: you may read another member's board only if
// you are actually friends.
//
// That check used to sit inside the data layer, where every friend-scoped
// query re-implemented it. Here it is stated once, and the progress repository
// stays a plain data source with no opinion about who may read what.
type Service struct {
	repo *Repo
	// progress supplies the underlying board queries once access is granted.
	progress *progress.Repo
}

func NewService(repo *Repo, progressRepo *progress.Repo) *Service {
	return &Service{repo: repo, progress: progressRepo}
}

func (s *Service) Friends(ctx context.Context, userID string) ([]FriendRow, error) {
	return s.repo.Friends(ctx, userID)
}

func (s *Service) Directory(ctx context.Context, userID string) ([]FriendRow, error) {
	return s.repo.Directory(ctx, userID)
}

func (s *Service) IncomingRequests(ctx context.Context, userID string) ([]FriendRow, error) {
	return s.repo.IncomingRequests(ctx, userID)
}

func (s *Service) SendRequest(ctx context.Context, userID, username string) error {
	return s.repo.SendFriendRequest(ctx, userID, username)
}

func (s *Service) AcceptRequest(ctx context.Context, userID, requesterID string) error {
	return s.repo.AcceptRequest(ctx, userID, requesterID)
}

func (s *Service) DeclineRequest(ctx context.Context, userID, requesterID string) error {
	return s.repo.DeclineRequest(ctx, userID, requesterID)
}

func (s *Service) RemoveFriend(ctx context.Context, userID, friendID string) error {
	return s.repo.RemoveFriend(ctx, userID, friendID)
}

// authorize returns domain.ErrNotFound unless the two users are friends. It
// reports "not found" rather than "forbidden" deliberately: a stranger should
// not be able to probe who exists by reading status codes.
func (s *Service) authorize(ctx context.Context, userID, friendID string) error {
	ok, err := s.repo.AreFriends(ctx, userID, friendID)
	if err != nil {
		return err
	}
	if !ok {
		return domain.ErrNotFound
	}
	return nil
}

func (s *Service) FriendProgress(ctx context.Context, userID, friendID string) ([]progress.ProblemRow, error) {
	if err := s.authorize(ctx, userID, friendID); err != nil {
		return nil, err
	}
	return s.progress.Progress(ctx, friendID)
}

func (s *Service) FriendCalendar(ctx context.Context, userID, friendID string) ([]domain.DayCount, error) {
	if err := s.authorize(ctx, userID, friendID); err != nil {
		return nil, err
	}
	return s.progress.Calendar(ctx, friendID)
}

func (s *Service) FriendCalendarProblems(ctx context.Context, userID, friendID string) ([]progress.CalendarProblem, error) {
	if err := s.authorize(ctx, userID, friendID); err != nil {
		return nil, err
	}
	return s.progress.CalendarProblems(ctx, friendID)
}

func (s *Service) FriendSolution(ctx context.Context, userID, friendID, slug string, recent bool) ([]progress.SolutionRow, error) {
	if err := s.authorize(ctx, userID, friendID); err != nil {
		return nil, err
	}
	return s.progress.Solutions(ctx, friendID, slug, recent)
}
