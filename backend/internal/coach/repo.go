package coach

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Repo reads the evidence the coach reasons from - a member's solves, their
// accepted code, the modules they finished - and stores the conversation.
//
// It re-queries rather than borrowing the progress repo because the shapes
// differ: progress answers a dashboard, this answers a prompt.
type Repo struct {
	pool *pgxpool.Pool
}

func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

// Counts summarises the member's season in one row.
func (p *Repo) Counts(ctx context.Context, userID string) (Counts, error) {
	var c Counts
	err := p.pool.QueryRow(ctx, `
		select count(*),
		       count(*) filter (where pr.difficulty = 'Easy'),
		       count(*) filter (where pr.difficulty = 'Medium'),
		       count(*) filter (where pr.difficulty = 'Hard'),
		       count(*) filter (where pr.blind75),
		       count(*) filter (where pr.neetcode150),
		       count(*) filter (where pr.neetcode250)
		from solves s
		join problems pr on pr.id = s.problem_id
		where s.user_id = $1 and s.first_season_ac_at is not null`, userID).
		Scan(&c.Total, &c.Easy, &c.Medium, &c.Hard, &c.Blind75, &c.Neetcode150, &c.Neetcode250)
	return c, err
}

// SolvedList is every problem the member finished, newest first.
func (p *Repo) SolvedList(ctx context.Context, userID string) ([]Solved, error) {
	rows, err := p.pool.Query(ctx, `
		select pr.title, pr.slug, pr.difficulty, pr.category,
		       to_char(s.first_season_ac_at at time zone 'UTC', 'YYYY-MM-DD')
		from solves s
		join problems pr on pr.id = s.problem_id
		where s.user_id = $1 and s.first_season_ac_at is not null
		order by s.first_season_ac_at desc`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Solved{}
	for rows.Next() {
		var s Solved
		if err := rows.Scan(&s.Title, &s.Slug, &s.Difficulty, &s.Category, &s.At); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// Solutions returns the member's best accepted submission per problem, newest
// first: one row per problem, preferring the one the enricher scored optimal.
func (p *Repo) Solutions(ctx context.Context, userID string, limit int) ([]Solution, error) {
	rows, err := p.pool.Query(ctx, `
		select title, slug, difficulty, lang, code, runtime_pct, is_optimal,
		       to_char(solved_at at time zone 'UTC', 'YYYY-MM-DD')
		from (
			select distinct on (s.problem_id)
			       pr.title, pr.slug, pr.difficulty, s.lang, s.code,
			       s.runtime_pct, s.is_optimal, s.solved_at
			from solutions s
			join problems pr on pr.id = s.problem_id
			where s.user_id = $1 and s.code <> ''
			order by s.problem_id, s.is_optimal desc, s.solved_at desc
		) t
		order by t.solved_at desc
		limit $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Solution{}
	for rows.Next() {
		var s Solution
		if err := rows.Scan(&s.Title, &s.Slug, &s.Difficulty, &s.Lang, &s.Code,
			&s.RuntimePct, &s.Optimal, &s.At); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// SolutionsFor returns the member's accepted code for named problems, so a
// question about a specific problem can carry that problem's code even when it
// falls outside the recent window.
func (p *Repo) SolutionsFor(ctx context.Context, userID string, slugs []string) ([]Solution, error) {
	if len(slugs) == 0 {
		return nil, nil
	}
	rows, err := p.pool.Query(ctx, `
		select distinct on (s.problem_id)
		       pr.title, pr.slug, pr.difficulty, s.lang, s.code,
		       s.runtime_pct, s.is_optimal,
		       to_char(s.solved_at at time zone 'UTC', 'YYYY-MM-DD')
		from solutions s
		join problems pr on pr.id = s.problem_id
		where s.user_id = $1 and pr.slug = any($2) and s.code <> ''
		order by s.problem_id, s.is_optimal desc, s.solved_at desc`, userID, slugs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Solution{}
	for rows.Next() {
		var s Solution
		if err := rows.Scan(&s.Title, &s.Slug, &s.Difficulty, &s.Lang, &s.Code,
			&s.RuntimePct, &s.Optimal, &s.At); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// Modules lists the System Design and GenAI modules the member completed.
func (p *Repo) Modules(ctx context.Context, userID string) ([]string, error) {
	rows, err := p.pool.Query(ctx,
		`select slug from sd_solves where user_id = $1 order by solved_at desc`, userID)
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

// History returns the last n turns of a thread in chronological order. A
// thread is (user, job); jobID is empty for general prep.
func (p *Repo) History(ctx context.Context, userID, jobID string, limit int) ([]Turn, error) {
	rows, err := p.pool.Query(ctx, `
		select role, content, created_at from (
			select role, content, created_at from coach_messages
			where user_id = $1 and job_id is not distinct from $2::uuid
			order by created_at desc limit $3
		) t order by t.created_at`, userID, nullable(jobID), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Turn{}
	for rows.Next() {
		var t Turn
		var at time.Time
		if err := rows.Scan(&t.Role, &t.Content, &at); err != nil {
			return nil, err
		}
		t.At = at.Format(time.RFC3339)
		out = append(out, t)
	}
	return out, rows.Err()
}

func (p *Repo) AskedSince(ctx context.Context, userID string, since time.Time) (int, error) {
	var n int
	err := p.pool.QueryRow(ctx,
		`select count(*) from coach_messages where user_id = $1 and role = 'user' and created_at >= $2`,
		userID, since).Scan(&n)
	return n, err
}

// AppendTurns stores a question and its answer as one unit, so a thread never
// keeps a question whose reply was lost.
func (p *Repo) AppendTurns(ctx context.Context, userID, jobID, question, answer string) error {
	_, err := p.pool.Exec(ctx, `
		insert into coach_messages (user_id, job_id, role, content)
		values ($1, $2::uuid, 'user', $3), ($1, $2::uuid, 'assistant', $4)`,
		userID, nullable(jobID), question, answer)
	return err
}

func (p *Repo) ClearHistory(ctx context.Context, userID, jobID string) error {
	_, err := p.pool.Exec(ctx,
		`delete from coach_messages where user_id = $1 and job_id is not distinct from $2::uuid`,
		userID, nullable(jobID))
	return err
}

// nullable turns the empty job id into a SQL NULL, which is what makes the
// general-prep thread a thread of its own rather than a missing row.
func nullable(id string) any {
	if id == "" {
		return nil
	}
	return id
}
