package main

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"time"

	"kronos/internal/leetcode"
	"kronos/internal/poller"
)

type memStore struct {
	states  map[string]poller.State
	solves  []poller.Solve
	flagged []int
}

func newMemStore() *memStore {
	return &memStore{states: map[string]poller.State{}}
}

func (m *memStore) LoadState(_ context.Context, userID string) (poller.State, error) {
	return m.states[userID], nil
}

func (m *memStore) SaveState(_ context.Context, userID string, state poller.State) error {
	m.states[userID] = state
	return nil
}

func (m *memStore) RecordSolve(_ context.Context, solve poller.Solve) error {
	m.solves = append(m.solves, solve)
	return nil
}

func (m *memStore) FlagOverflow(_ context.Context, _ string, missing int) error {
	m.flagged = append(m.flagged, missing)
	return nil
}

type fakeSource struct {
	count  int
	recent []leetcode.AcceptedSubmission
}

func (f *fakeSource) AcceptedCount(_ context.Context, _ string) (int, error) {
	return f.count, nil
}

func (f *fakeSource) RecentAccepted(_ context.Context, _ string, _ int) ([]leetcode.AcceptedSubmission, error) {
	return f.recent, nil
}

func epoch(iso string) int64 {
	t, _ := time.Parse(time.RFC3339, iso)
	return t.Unix()
}

func loadCatalog(path string) (poller.Catalog, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	row := regexp.MustCompile(`\((\d+),\s*'([^']+)'`)
	catalog := poller.Catalog{}
	for _, match := range row.FindAllStringSubmatch(string(data), -1) {
		id, _ := strconv.Atoi(match[1])
		catalog[match[2]] = id
	}
	return catalog, nil
}

func runDemo(ctx context.Context, catalog poller.Catalog) {
	fmt.Println("\n# deterministic demo")
	source := &fakeSource{}
	memory := newMemStore()
	engine := &poller.Engine{Source: source, Store: memory, Catalog: catalog, Season: epoch("2026-06-05T00:00:00Z")}
	member := poller.Member{UserID: "demo", LeetCodeUser: "demo"}

	source.count = 5
	source.recent = []leetcode.AcceptedSubmission{
		{ID: 1001, Slug: "two-sum", Timestamp: epoch("2026-06-10T12:00:00Z")},
		{ID: 1002, Slug: "valid-anagram", Timestamp: epoch("2026-06-09T12:00:00Z")},
		{ID: 1003, Slug: "weekly-contest-only-problem", Timestamp: epoch("2026-06-08T12:00:00Z")},
		{ID: 1004, Slug: "contains-duplicate", Timestamp: epoch("2026-06-01T12:00:00Z")},
	}
	first, _ := engine.SyncMember(ctx, member)
	fmt.Printf("  run1 baseline  %+v captured=%d\n", first, len(memory.solves))

	second, _ := engine.SyncMember(ctx, member)
	fmt.Printf("  run2 no-op     %+v\n", second)

	before := len(memory.solves)
	source.count = 30
	source.recent = []leetcode.AcceptedSubmission{
		{ID: 1005, Slug: "3sum", Timestamp: epoch("2026-06-12T12:00:00Z")},
		{ID: 1006, Slug: "two-sum", Timestamp: epoch("2026-06-10T12:00:00Z")},
	}
	third, _ := engine.SyncMember(ctx, member)
	fmt.Printf("  run3 burst     %+v captured=%d flagged=%v\n", third, len(memory.solves)-before, memory.flagged)
}

func runLive(ctx context.Context, catalog poller.Catalog, username string) {
	fmt.Printf("\n# live sync: %s\n", username)
	engine := &poller.Engine{Source: leetcode.New(), Store: newMemStore(), Catalog: catalog, Season: 0}
	member := poller.Member{UserID: "live", LeetCodeUser: username}
	first, err := engine.SyncMember(ctx, member)
	if err != nil {
		fmt.Println("  error:", err)
		return
	}
	fmt.Printf("  run1 %+v\n", first)
	second, _ := engine.SyncMember(ctx, member)
	fmt.Printf("  run2 %+v\n", second)
}

func runDetail(ctx context.Context, session string) {
	fmt.Println("\n# authenticated submission detail")
	detail, err := leetcode.New().SubmissionDetail(ctx, 1948770745, session)
	if err != nil {
		fmt.Println("  error:", err)
		return
	} 
	if detail == nil {
		fmt.Println("  nil (session expired)")
		return
	}
	fmt.Printf("  lang=%s runtimePct=%.1f optimal=%v codeChars=%d\n",
		detail.Language, detail.RuntimePercentile, leetcode.IsOptimal(detail.RuntimePercentile), len(detail.Code))
}

func main() {
	ctx := context.Background()
	catalog, err := loadCatalog("db/seed_problems.sql")
	if err != nil {
		fmt.Println("catalog:", err)
		os.Exit(1)
	}
	fmt.Printf("catalog: %d problems\n", len(catalog))

	runDemo(ctx, catalog)

	if len(os.Args) > 1 {
		runLive(ctx, catalog, os.Args[1])
	}
	if session := os.Getenv("LC_SESS"); session != "" {
		runDetail(ctx, session)
	}
}
