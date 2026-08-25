package design

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Repo stores System Design / GenAI module progress and rankings.
type Repo struct {
	pool *pgxpool.Pool
}

// NewRepo wires the repository to the shared connection pool.
func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

// SaveSDAttempt stores the user's latest canvas build for a module.
func (p *Repo) SaveSDAttempt(ctx context.Context, userID, slug, designJSON string, ok bool) error {
	_, err := p.pool.Exec(ctx, `
		insert into sd_attempts (user_id, slug, design, ok, updated_at)
		values ($1, $2, $3::jsonb, $4, now())
		on conflict (user_id, slug) do update set design = excluded.design, ok = excluded.ok, updated_at = now()`,
		userID, slug, designJSON, ok)
	return err
}

// LatestSDAttempts returns the user's most recent canvas builds, newest first.
func (p *Repo) LatestSDAttempts(ctx context.Context, userID string, limit int) ([]SDAttempt, error) {
	rows, err := p.pool.Query(ctx, `
		select slug, design::text, ok from sd_attempts
		where user_id = $1 order by updated_at desc limit $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SDAttempt{}
	for rows.Next() {
		var a SDAttempt
		if err := rows.Scan(&a.Slug, &a.Design, &a.OK); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (p *Repo) RecordSDSolve(ctx context.Context, userID, slug string) error {
	_, err := p.pool.Exec(ctx,
		`insert into sd_solves (user_id, slug) values ($1, $2) on conflict do nothing`,
		userID, slug)
	return err
}

func (p *Repo) SDSolved(ctx context.Context, userID string) ([]string, error) {
	rows, err := p.pool.Query(ctx, `select slug from sd_solves where user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// MySDActivity returns the current user's own module completions, newest first.
func (p *Repo) MySDActivity(ctx context.Context, userID string) ([]SDActivityRow, error) {
	rows, err := p.pool.Query(ctx, `
		select slug, solved_at from sd_solves
		where user_id = $1
		order by solved_at desc`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SDActivityRow{}
	for rows.Next() {
		var r SDActivityRow
		var at time.Time
		if err := rows.Scan(&r.Slug, &at); err != nil {
			return nil, err
		}
		r.At = at.Format(time.RFC3339)
		out = append(out, r)
	}
	return out, rows.Err()
}

// SDActivity returns recent System Design module completions across approved
// users. kind filters by slug prefix ("design"/"genai"; empty = all). It never
// exposes any build/solution content - only that the module was solved.
func (p *Repo) SDActivity(ctx context.Context, limit int, kind string) ([]SDActivityRow, error) {
	prefix := ""
	if kind == "design" || kind == "genai" {
		prefix = kind + "-"
	}
	rows, err := p.pool.Query(ctx, `
		select u.display_name, coalesce(u.leetcode_user::text, ''), s.slug, s.solved_at
		from sd_solves s
		join users u on u.id = s.user_id
		where u.active and ($2 = '' or s.slug like $2 || '%')
		order by s.solved_at desc
		limit $1`, limit, prefix)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SDActivityRow{}
	for rows.Next() {
		var r SDActivityRow
		var at time.Time
		if err := rows.Scan(&r.Name, &r.Username, &r.Slug, &at); err != nil {
			return nil, err
		}
		r.At = at.Format(time.RFC3339)
		out = append(out, r)
	}
	return out, rows.Err()
}

// SDLeaderboard ranks approved users by how many modules they've completed.
// kind filters by slug prefix: "design" or "genai" (empty = all modules).
func (p *Repo) SDLeaderboard(ctx context.Context, limit int, kind string) ([]SDLeaderRow, error) {
	prefix := ""
	if kind == "design" || kind == "genai" {
		prefix = kind + "-"
	}
	rows, err := p.pool.Query(ctx, `
		select u.display_name, coalesce(u.leetcode_user::text, ''),
			count(s.slug) filter (where $2 = '' or s.slug like $2 || '%')
		from users u
		left join sd_solves s on s.user_id = u.id
		where u.active
		group by u.id
		order by count(s.slug) filter (where $2 = '' or s.slug like $2 || '%') desc, u.display_name
		limit $1`, limit, prefix)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SDLeaderRow{}
	for rows.Next() {
		var r SDLeaderRow
		if err := rows.Scan(&r.Name, &r.Username, &r.Count); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
