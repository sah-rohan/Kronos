package pad

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/domain"
)

type Repo struct {
	pool *pgxpool.Pool
}

func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

var ErrStale = errors.New("pad changed since it was loaded")

const summaryCols = `p.id, pr.slug, pr.title, pr.difficulty, pr.category, p.language, p.status,
	coalesce(p.overall, ''), p.started_at, p.submitted_at`

func scanSummary(row pgx.Row, s *Summary, extra ...any) error {
	var started time.Time
	var submitted *time.Time
	dest := append([]any{&s.ID, &s.Slug, &s.Title, &s.Difficulty, &s.Category, &s.Language, &s.Status,
		&s.Overall, &started, &submitted}, extra...)
	if err := row.Scan(dest...); err != nil {
		return err
	}
	s.StartedAt = started.Format(time.RFC3339)
	if submitted != nil {
		s.SubmittedAt = submitted.Format(time.RFC3339)
	}
	return nil
}

func (p *Repo) Problem(ctx context.Context, slug string) (int, error) {
	var id int
	err := p.pool.QueryRow(ctx, `select id from problems where slug = $1`, slug).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, domain.ErrNotFound
	}
	return id, err
}

// OpenDraft returns the member's draft for a problem, creating it when there is none.
func (p *Repo) OpenDraft(ctx context.Context, userID string, problemID int, language string, first Block) (string, error) {
	blocks, err := json.Marshal([]Block{first})
	if err != nil {
		return "", err
	}
	if _, err := p.pool.Exec(ctx, `
		insert into pads (user_id, problem_id, language, blocks)
		values ($1, $2, $3, $4)
		on conflict (user_id, problem_id) where status = 'draft' do nothing`,
		userID, problemID, language, blocks); err != nil {
		return "", err
	}
	var id string
	err = p.pool.QueryRow(ctx,
		`select id from pads where user_id = $1 and problem_id = $2 and status = 'draft'`,
		userID, problemID).Scan(&id)
	return id, err
}

func (p *Repo) List(ctx context.Context, userID string, limit int) ([]Summary, error) {
	rows, err := p.pool.Query(ctx, `
		select `+summaryCols+`
		from pads p join problems pr on pr.id = p.problem_id
		where p.user_id = $1
		order by p.started_at desc limit $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Summary{}
	for rows.Next() {
		var s Summary
		if err := scanSummary(rows, &s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// Get loads a pad. userID empty skips the owner check, which only the grader does.
func (p *Repo) Get(ctx context.Context, userID, id string) (Pad, string, error) {
	var pd Pad
	var owner string
	var blocks, feedback []byte
	row := p.pool.QueryRow(ctx, `
		select `+summaryCols+`, p.blocks, p.version, p.feedback, p.user_id,
		       (select count(*) from pads o
		        where o.user_id = p.user_id and o.problem_id = p.problem_id and o.started_at <= p.started_at)
		from pads p join problems pr on pr.id = p.problem_id
		where p.id = $1 and ($2 = '' or p.user_id::text = $2)`, id, userID)
	err := scanSummary(row, &pd.Summary, &blocks, &pd.Version, &feedback, &owner, &pd.Attempt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Pad{}, "", domain.ErrNotFound
	}
	if err != nil {
		return Pad{}, "", err
	}
	if err := json.Unmarshal(blocks, &pd.Blocks); err != nil {
		return Pad{}, "", err
	}
	if len(feedback) > 0 {
		pd.Feedback = &Feedback{}
		if err := json.Unmarshal(feedback, pd.Feedback); err != nil {
			return Pad{}, "", err
		}
	}
	return pd, owner, nil
}

func (p *Repo) Save(ctx context.Context, userID, id string, in SaveInput) (int, error) {
	blocks, err := json.Marshal(in.Blocks)
	if err != nil {
		return 0, err
	}
	var version int
	err = p.pool.QueryRow(ctx, `
		update pads set blocks = $3, language = $4, version = version + 1
		where id = $1 and user_id = $2 and status = 'draft' and version = $5
		returning version`, id, userID, blocks, in.Language, in.Version).Scan(&version)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrStale
	}
	return version, err
}

func (p *Repo) Delete(ctx context.Context, userID, id string) error {
	tag, err := p.pool.Exec(ctx, `delete from pads where id = $1 and user_id = $2`, id, userID)
	if err == nil && tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return err
}

func (p *Repo) SubmittedSince(ctx context.Context, userID string, since time.Time) (int, error) {
	var n int
	err := p.pool.QueryRow(ctx,
		`select count(*) from pads where user_id = $1 and submitted_at >= $2`, userID, since).Scan(&n)
	return n, err
}

// MarkGrading queues a draft, a failed pad, or one stuck in grading past stuckAfter.
func (p *Repo) MarkGrading(ctx context.Context, userID, id string, stuckAfter time.Duration) (bool, error) {
	tag, err := p.pool.Exec(ctx, `
		update pads
		set status = 'grading', submitted_at = coalesce(submitted_at, now()), queued_at = now()
		where id = $1 and user_id = $2
		  and (status in ('draft', 'failed') or (status = 'grading' and queued_at < now() - make_interval(secs => $3)))`,
		id, userID, stuckAfter.Seconds())
	return tag.RowsAffected() == 1, err
}

func (p *Repo) SaveFeedback(ctx context.Context, id string, f Feedback) error {
	raw, err := json.Marshal(f)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
		update pads set status = 'graded', overall = $2, feedback = $3
		where id = $1 and status = 'grading'`, id, f.Overall, raw)
	return err
}

func (p *Repo) MarkFailed(ctx context.Context, id string) error {
	_, err := p.pool.Exec(ctx, `update pads set status = 'failed' where id = $1 and status = 'grading'`, id)
	return err
}

// Graded returns the member's most recent graded pads, newest first, skipping exclude.
func (p *Repo) Graded(ctx context.Context, userID, exclude string, limit int) ([]graded, error) {
	rows, err := p.pool.Query(ctx, `
		select p.id, pr.title, p.submitted_at, p.feedback
		from pads p join problems pr on pr.id = p.problem_id
		where p.user_id = $1 and p.status = 'graded' and p.id::text <> $2
		order by p.submitted_at desc limit $3`, userID, exclude, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []graded{}
	for rows.Next() {
		var g graded
		var at time.Time
		var raw []byte
		if err := rows.Scan(&g.ID, &g.Title, &at, &raw); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(raw, &g.Feedback); err != nil {
			return nil, err
		}
		g.At = at.Format(time.RFC3339)
		out = append(out, g)
	}
	return out, rows.Err()
}
