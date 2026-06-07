package poller

import (
	"context"
	"errors"
	"sync"
	"time"

	"kronos/internal/leetcode"
)

const (
	window         = 20
	activeInterval = 30 * time.Second
	idleInterval   = 30 * time.Second
)

var ErrSessionExpired = errors.New("leetcode session expired")

type Catalog map[string]int

type Member struct {
	UserID       string
	LeetCodeUser string
}

type State struct {
	LastCount  int
	LastSeenAt int64
	NextPollAt time.Time
}

type Solve struct {
	UserID       string
	ProblemID    int
	SolvedAt     int64
	SubmissionID int64
}

type Pending struct {
	UserID       string
	ProblemID    int
	SubmissionID int64
	SolvedAt     int64
}

type Result struct {
	Captured int
	Delta    int
	Overflow bool
}

type Source interface {
	AcceptedCount(ctx context.Context, username string) (int, error)
	RecentAccepted(ctx context.Context, username string, limit int) ([]leetcode.AcceptedSubmission, error)
}

type Detailer interface {
	SubmissionDetail(ctx context.Context, submissionID int64, session string) (*leetcode.SubmissionDetail, error)
}

type Store interface {
	LoadState(ctx context.Context, userID string) (State, error)
	SaveState(ctx context.Context, userID string, state State) error
	RecordSolve(ctx context.Context, solve Solve) error
	FlagOverflow(ctx context.Context, userID string, missing int) error
}

type EnrichStore interface {
	PendingEnrichment(ctx context.Context, limit int) ([]Pending, error)
	SaveDetail(ctx context.Context, pending Pending, detail leetcode.SubmissionDetail) error
}

type Engine struct {
	Source  Source
	Store   Store
	Catalog Catalog
	Season  int64
}

func (e *Engine) SyncMember(ctx context.Context, member Member) (Result, error) {
	state, err := e.Store.LoadState(ctx, member.UserID)
	if err != nil {
		return Result{}, err
	}
	firstSync := state.LastCount == 0

	count, err := e.Source.AcceptedCount(ctx, member.LeetCodeUser)
	if err != nil {
		return Result{}, err
	}
	delta := count - state.LastCount

	if delta <= 0 {
		state.LastCount = count
		state.NextPollAt = time.Now().Add(idleInterval)
		return Result{}, e.Store.SaveState(ctx, member.UserID, state)
	}

	recent, err := e.Source.RecentAccepted(ctx, member.LeetCodeUser, window)
	if err != nil {
		return Result{}, err
	}

	captured := 0
	latest := state.LastSeenAt
	for _, submission := range recent {
		if submission.Timestamp <= state.LastSeenAt || submission.Timestamp < e.Season {
			continue
		}
		if submission.Timestamp > latest {
			latest = submission.Timestamp
		}
		problemID, tracked := e.Catalog[submission.Slug]
		if !tracked {
			continue
		}
		err := e.Store.RecordSolve(ctx, Solve{
			UserID:       member.UserID,
			ProblemID:    problemID,
			SolvedAt:     submission.Timestamp,
			SubmissionID: submission.ID,
		})
		if err != nil {
			return Result{}, err
		}
		captured++
	}

	overflow := !firstSync && delta > window
	if overflow {
		if err := e.Store.FlagOverflow(ctx, member.UserID, delta-window); err != nil {
			return Result{}, err
		}
	}

	state.LastCount = count
	state.LastSeenAt = latest
	state.NextPollAt = time.Now().Add(activeInterval)
	if err := e.Store.SaveState(ctx, member.UserID, state); err != nil {
		return Result{}, err
	}
	return Result{Captured: captured, Delta: delta, Overflow: overflow}, nil
}

func (e *Engine) SyncAll(ctx context.Context, members []Member, concurrency int) map[string]Result {
	results := make(map[string]Result, len(members))
	gate := make(chan struct{}, concurrency)
	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, member := range members {
		wg.Add(1)
		gate <- struct{}{}
		go func(member Member) {
			defer wg.Done()
			defer func() { <-gate }()
			result, err := e.SyncMember(ctx, member)
			if err != nil {
				return
			}
			mu.Lock()
			results[member.UserID] = result
			mu.Unlock()
		}(member)
	}
	wg.Wait()
	return results
}

type Enricher struct {
	Detailer Detailer
	Store    EnrichStore
	Session  string
}

func (en *Enricher) Run(ctx context.Context, batch int) (int, error) {
	pending, err := en.Store.PendingEnrichment(ctx, batch)
	if err != nil {
		return 0, err
	}
	enriched := 0
	for _, item := range pending {
		detail, err := en.Detailer.SubmissionDetail(ctx, item.SubmissionID, en.Session)
		if err != nil {
			return enriched, err
		}
		if detail == nil {
			return enriched, ErrSessionExpired
		}
		if err := en.Store.SaveDetail(ctx, item, *detail); err != nil {
			return enriched, err
		}
		enriched++
	}
	return enriched, nil
}
