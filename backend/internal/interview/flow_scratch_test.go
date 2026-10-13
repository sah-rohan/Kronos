package interview

import (
	"context"
	"fmt"
	"testing"
	"time"

	"kronos/internal/career"
	"kronos/internal/domain"
	"kronos/internal/platform/ai"
	"kronos/internal/platform/jobs"
	"kronos/internal/platform/db"
)

func TestFlowScratch(t *testing.T) {
	ctx := context.Background()
	pool, err := db.Open(ctx, "postgres://postgres@127.0.0.1:55432/kronos?sslmode=disable")
	if err != nil { t.Fatal(err) }
	var uid string
	pool.QueryRow(ctx, `insert into users (display_name) values ('Test') returning id`).Scan(&uid)
	pool.Exec(ctx, `insert into solves (user_id, problem_id, first_season_ac_at)
		select $1, id, now() from problems where category = 'Arrays & Hashing'`, uid)
	pool.Exec(ctx, `insert into resumes (user_id, label, content, is_primary) values ($1, 'New grad', 'Intern, Acme 2025: cut p95 latency 40% by batching writes behind a queue.', true)`, uid)

	ep := "https://forge3adc8d-openai.openai.azure.com"
	svc := NewService(NewRepo(pool), career.NewRepo(pool), ai.New(ep, "balanced", "", "medium"), ai.New(ep, "deep", "", "high"))
	svc.SetQueue(jobs.Func(svc.Grade))
	u := domain.User{ID: uid}

	iv, err := svc.Start(ctx, u, StartInput{Kind: "coding", Difficulty: "Medium"})
	if err != nil { t.Fatal(err) }
	fmt.Printf("CODING picked: %s (%s) %d min\nOPENING: %s\n\n", iv.Title, iv.Subject, iv.Minutes, iv.Turns[0].Content)
	var cat string
	pool.QueryRow(ctx, `select category from problems where slug=$1`, iv.Subject).Scan(&cat)
	fmt.Println("category:", cat)

	iv, err = svc.Reply(ctx, uid, iv.ID, "Quick clarifying question: can the input be empty?", "", 0)
	if err != nil { t.Fatal(err) }
	fmt.Printf("REPLY: %s\n\n", iv.Turns[len(iv.Turns)-1].Content)

	iv, err = svc.Reply(ctx, uid, iv.ID, "Here is my code.", "def solve(nums):\n    return sorted(nums)", 0)
	if err != nil { t.Fatal(err) }
	fmt.Printf("AFTER CODE: %s (turns=%d, code kept=%v)\n\n", iv.Turns[len(iv.Turns)-1].Content, len(iv.Turns), iv.Turns[len(iv.Turns)-2].Code != "")

	if _, err := svc.Followup(ctx, uid, iv.ID, "why?"); err != ErrState { t.Fatalf("followup before grade: %v", err) }

	start := time.Now()
	iv, err = svc.End(ctx, uid, iv.ID)
	if err != nil { t.Fatal(err) }
	fmt.Printf("ENDED in %s: status=%s verdict=%s\n%s\n\n", time.Since(start).Round(time.Second), iv.Status, iv.Verdict, iv.Debrief.Summary)

	if _, err := svc.End(ctx, uid, iv.ID); err != ErrState { t.Fatalf("double end: %v", err) }
	if _, err := svc.Reply(ctx, uid, iv.ID, "more", "", 0); err != ErrState { t.Fatalf("reply after end: %v", err) }
	if _, err := svc.Get(ctx, "00000000-0000-0000-0000-000000000000", iv.ID); err != domain.ErrNotFound { t.Fatalf("other user: %v", err) }

	iv, err = svc.Followup(ctx, uid, iv.ID, "My code was short. Why isn't that enough?")
	if err != nil { t.Fatal(err) }
	fmt.Printf("FOLLOWUP: %s\n\n", iv.Followups[1].Content)

	list, _ := svc.List(ctx, uid)
	fmt.Printf("LIST: %+v\n", list)

	if _, err := svc.Start(ctx, domain.User{ID: uid}, StartInput{Kind: "resume"}); err != nil { t.Fatal(err) }
	pool.Exec(ctx, `delete from resumes where user_id=$1`, uid)
	if _, err := svc.Start(ctx, u, StartInput{Kind: "resume"}); err != ErrNoResume { t.Fatalf("no resume: %v", err) }
	if _, err := svc.Start(ctx, u, StartInput{Kind: "nope"}); err != ErrInvalid { t.Fatalf("bad kind: %v", err) }
}
