package career

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/domain"
)

// Repo stores the member's resumes and the roles they are applying to. Every
// query is scoped by user_id, so one member can never read another's documents.
type Repo struct {
	pool *pgxpool.Pool
}

func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (p *Repo) Resumes(ctx context.Context, userID string) ([]Resume, error) {
	rows, err := p.pool.Query(ctx, `
		select id, label, is_primary, length(content), updated_at
		from resumes where user_id = $1
		order by is_primary desc, updated_at desc`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Resume{}
	for rows.Next() {
		var r Resume
		var at time.Time
		if err := rows.Scan(&r.ID, &r.Label, &r.Primary, &r.Chars, &at); err != nil {
			return nil, err
		}
		r.UpdatedAt = at.Format(time.RFC3339)
		out = append(out, r)
	}
	return out, rows.Err()
}

func (p *Repo) Resume(ctx context.Context, userID, id string) (Resume, error) {
	var r Resume
	var at time.Time
	err := p.pool.QueryRow(ctx, `
		select id, label, content, is_primary, length(content), updated_at
		from resumes where user_id = $1 and id = $2`, userID, id).
		Scan(&r.ID, &r.Label, &r.Content, &r.Primary, &r.Chars, &at)
	if errors.Is(err, pgx.ErrNoRows) {
		return Resume{}, domain.ErrNotFound
	}
	if err != nil {
		return Resume{}, err
	}
	r.UpdatedAt = at.Format(time.RFC3339)
	return r, nil
}

// PrimaryResume is what the coach reads when no resume is named. It falls back
// to the most recently updated one, so a member who never picked a primary
// still gets their latest.
func (p *Repo) PrimaryResume(ctx context.Context, userID string) (Resume, error) {
	var r Resume
	var at time.Time
	err := p.pool.QueryRow(ctx, `
		select id, label, content, is_primary, length(content), updated_at
		from resumes where user_id = $1
		order by is_primary desc, updated_at desc limit 1`, userID).
		Scan(&r.ID, &r.Label, &r.Content, &r.Primary, &r.Chars, &at)
	if errors.Is(err, pgx.ErrNoRows) {
		return Resume{}, domain.ErrNotFound
	}
	if err != nil {
		return Resume{}, err
	}
	r.UpdatedAt = at.Format(time.RFC3339)
	return r, nil
}

// SaveResume inserts a new resume, or replaces the content of an existing one
// when id is non-empty. It returns the stored row's id.
func (p *Repo) SaveResume(ctx context.Context, userID, id, label, content string) (string, error) {
	if id == "" {
		err := p.pool.QueryRow(ctx, `
			insert into resumes (user_id, label, content, is_primary)
			values ($1, $2, $3, not exists (select 1 from resumes where user_id = $1))
			returning id`, userID, label, content).Scan(&id)
		return id, err
	}
	tag, err := p.pool.Exec(ctx, `
		update resumes set label = $3, content = $4, updated_at = now()
		where user_id = $1 and id = $2`, userID, id, label, content)
	if err != nil {
		return "", err
	}
	if tag.RowsAffected() == 0 {
		return "", domain.ErrNotFound
	}
	return id, nil
}

// SetPrimaryResume moves the primary flag, clearing the old holder first so
// the partial unique index never sees two.
func (p *Repo) SetPrimaryResume(ctx context.Context, userID, id string) error {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`update resumes set is_primary = false where user_id = $1 and is_primary`, userID); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx,
		`update resumes set is_primary = true, updated_at = now() where user_id = $1 and id = $2`, userID, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit(ctx)
}

func (p *Repo) DeleteResume(ctx context.Context, userID, id string) error {
	_, err := p.pool.Exec(ctx, `delete from resumes where user_id = $1 and id = $2`, userID, id)
	return err
}

func (p *Repo) Jobs(ctx context.Context, userID string) ([]Job, error) {
	rows, err := p.pool.Query(ctx, `
		select id, company, title, location, url, status, updated_at
		from jobs where user_id = $1 order by updated_at desc`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Job{}
	for rows.Next() {
		var j Job
		var at time.Time
		if err := rows.Scan(&j.ID, &j.Company, &j.Title, &j.Location, &j.URL, &j.Status, &at); err != nil {
			return nil, err
		}
		j.UpdatedAt = at.Format(time.RFC3339)
		out = append(out, j)
	}
	return out, rows.Err()
}

func (p *Repo) Job(ctx context.Context, userID, id string) (Job, error) {
	var j Job
	var at time.Time
	err := p.pool.QueryRow(ctx, `
		select id, company, title, location, url, description, status, updated_at
		from jobs where user_id = $1 and id = $2`, userID, id).
		Scan(&j.ID, &j.Company, &j.Title, &j.Location, &j.URL, &j.Description, &j.Status, &at)
	if errors.Is(err, pgx.ErrNoRows) {
		return Job{}, domain.ErrNotFound
	}
	if err != nil {
		return Job{}, err
	}
	j.UpdatedAt = at.Format(time.RFC3339)
	return j, nil
}

// SaveJob inserts or updates one listing, returning its id.
func (p *Repo) SaveJob(ctx context.Context, userID string, j Job) (string, error) {
	if j.ID == "" {
		err := p.pool.QueryRow(ctx, `
			insert into jobs (user_id, company, title, location, url, description, status)
			values ($1, $2, $3, $4, $5, $6, $7) returning id`,
			userID, j.Company, j.Title, j.Location, j.URL, j.Description, j.Status).Scan(&j.ID)
		return j.ID, err
	}
	tag, err := p.pool.Exec(ctx, `
		update jobs set company = $3, title = $4, location = $5, url = $6,
		                description = $7, status = $8, updated_at = now()
		where user_id = $1 and id = $2`,
		userID, j.ID, j.Company, j.Title, j.Location, j.URL, j.Description, j.Status)
	if err != nil {
		return "", err
	}
	if tag.RowsAffected() == 0 {
		return "", domain.ErrNotFound
	}
	return j.ID, nil
}

func (p *Repo) DeleteJob(ctx context.Context, userID, id string) error {
	_, err := p.pool.Exec(ctx, `delete from jobs where user_id = $1 and id = $2`, userID, id)
	return err
}
