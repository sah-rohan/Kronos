package admin

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/domain"
)

// Repo backs the admin console: membership review, analytics, settings.
type Repo struct {
	pool *pgxpool.Pool
}

// NewRepo wires the repository to the shared connection pool.
func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (p *Repo) ListPending(ctx context.Context) ([]domain.User, error) {
	rows, err := p.pool.Query(ctx, `
		select id::text, coalesce(leetcode_user::text, ''), coalesce(github_user, ''), display_name, status, role
		from users where status = 'pending' and active order by created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []domain.User{}
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.LeetcodeUser, &u.GithubUser, &u.DisplayName, &u.Status, &u.Role); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (p *Repo) AllUsers(ctx context.Context) ([]domain.User, error) {
	rows, err := p.pool.Query(ctx, `
		select id::text, coalesce(leetcode_user::text, ''), coalesce(github_user, ''), display_name, coalesce(email, ''), status, role, coalesce(requested_username, '')
		from users
		where active
		order by (leetcode_user is null) desc, display_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []domain.User{}
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.LeetcodeUser, &u.GithubUser, &u.DisplayName, &u.Email, &u.Status, &u.Role, &u.RequestedUsername); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (p *Repo) Approve(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `update users set status = 'approved' where id = $1`, userID)
	return err
}

func (p *Repo) DeleteUser(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `update users set active = false where id = $1`, userID)
	return err
}

// PurgeUser hard-deletes a user and all their data (solves/solutions/friendships
// cascade). Used to reject a pending sign-up so the Clerk ID + LeetCode username
// free up and they can register again.
func (p *Repo) PurgeUser(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `delete from users where id = $1`, userID)
	return err
}

// GetSetting reads an app-level setting (empty string if unset).
func (p *Repo) GetSetting(ctx context.Context, key string) (string, error) {
	var v string
	err := p.pool.QueryRow(ctx, `select value from app_settings where key = $1`, key).Scan(&v)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return v, err
}

// SetSetting upserts an app-level setting.
func (p *Repo) SetSetting(ctx context.Context, key, value string) error {
	_, err := p.pool.Exec(ctx,
		`insert into app_settings (key, value) values ($1, $2)
		 on conflict (key) do update set value = excluded.value`, key, value)
	return err
}

// Analytics returns group-usage aggregates for the admin dashboard. All counts
// are derived from existing data — no tracking, no external service.
func (p *Repo) Analytics(ctx context.Context) (Analytics, error) {
	var a Analytics
	err := p.pool.QueryRow(ctx, `
		select
			(select count(*) from users where active and status = 'approved'),
			(select count(*) from users where active and status = 'pending'),
			(select count(*) from solves where first_season_ac_at is not null),
			(select count(*) from solves where first_season_ac_at >= now() - interval '7 days'),
			(select count(distinct user_id) from solves where first_season_ac_at >= now() - interval '7 days'),
			(select count(*) from visits),
			(select count(*) from visits where at >= now() - interval '7 days')
	`).Scan(&a.Users, &a.Pending, &a.Solves, &a.Solves7d, &a.Active7d, &a.Views, &a.Views7d)
	if err != nil {
		return a, err
	}

	rows, err := p.pool.Query(ctx, `
		select to_char(d::date, 'YYYY-MM-DD'), coalesce(c.count, 0)
		from generate_series((now() at time zone 'UTC')::date - 13, (now() at time zone 'UTC')::date, interval '1 day') d
		left join (
			select (first_season_ac_at at time zone 'UTC')::date as day, count(*)
			from solves where first_season_ac_at is not null
			group by day
		) c on c.day = d::date
		order by d`)
	if err != nil {
		return a, err
	}
	defer rows.Close()
	a.PerDay = []domain.DayCount{}
	for rows.Next() {
		var dc domain.DayCount
		if err := rows.Scan(&dc.Date, &dc.Count); err != nil {
			return a, err
		}
		a.PerDay = append(a.PerDay, dc)
	}
	return a, rows.Err()
}
