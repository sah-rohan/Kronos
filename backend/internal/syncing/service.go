package syncing

import (
	"context"
	"log"

	"kronos/internal/leetcode"
	"kronos/internal/poller"
)

// Service drives the LeetCode sync pipeline: poll a member's recent accepted
// submissions, record the new ones, then enrich them with code and runtime
// detail. The same logic serves the cron Lambda and the member's own
// "sync now" button, so the two can't drift apart.
type Service struct {
	repo *Repo
	// session returns the LeetCode session cookie enrichment needs; without it,
	// solves are still recorded but code detail can't be fetched. It is read on
	// every pass so a cookie the admin rotates takes effect without a redeploy.
	session func(context.Context) string
	season  int64
}

func NewService(repo *Repo, session func(context.Context) string, season int64) *Service {
	return &Service{repo: repo, session: session, season: season}
}

const (
	// enrichOnDemand is deliberately small: it runs inside a member's request,
	// so it must not stretch their latency. The cron pass does the bulk work.
	enrichOnDemand = 50
	enrichBatch    = 200
	dueMemberLimit = 1000
	syncWorkers    = 16
)

// engine builds a polling engine bound to the current problem catalog.
func (s *Service) engine(ctx context.Context) (*poller.Engine, error) {
	catalog, err := s.repo.Catalog(ctx)
	if err != nil {
		return nil, err
	}
	return &poller.Engine{
		Source:  leetcode.New(),
		Store:   s.repo,
		Catalog: catalog,
		Season:  s.season,
	}, nil
}

func (s *Service) enricher(ctx context.Context) *poller.Enricher {
	return &poller.Enricher{Detailer: leetcode.New(), Store: s.repo, Session: s.session(ctx)}
}

// SyncMember runs one member's sync on demand. Enrichment failure is logged
// rather than returned: the solves are already recorded, and the member's
// request should not fail because code detail lagged.
func (s *Service) SyncMember(ctx context.Context, userID, leetcodeUser string) error {
	if leetcodeUser == "" {
		return nil // nothing linked yet
	}
	engine, err := s.engine(ctx)
	if err != nil {
		return err
	}
	if _, err := engine.SyncMember(ctx, poller.Member{UserID: userID, LeetCodeUser: leetcodeUser}); err != nil {
		return err
	}
	if _, err := s.enricher(ctx).Run(ctx, enrichOnDemand); err != nil {
		log.Printf("on-demand enrich error: %v", err)
	}
	return nil
}

// RunOnce executes one full scheduled pass over every member who is due.
func (s *Service) RunOnce(ctx context.Context) error {
	engine, err := s.engine(ctx)
	if err != nil {
		return err
	}
	members, err := s.repo.DueMembers(ctx, dueMemberLimit)
	if err != nil {
		return err
	}
	results := engine.SyncAll(ctx, members, syncWorkers)
	log.Printf("polled %d due members", len(results))

	enriched, err := s.enricher(ctx).Run(ctx, enrichBatch)
	if err != nil {
		// A failed enrich pass is not a failed sync pass; the next run retries.
		log.Printf("enrich pass error: %v", err)
		return nil
	}
	log.Printf("enriched %d submissions", enriched)
	return nil
}

// Enrich runs a standalone enrichment pass, for the dedicated enrich Lambda.
func (s *Service) Enrich(ctx context.Context) (int, error) {
	return s.enricher(ctx).Run(ctx, enrichBatch)
}
