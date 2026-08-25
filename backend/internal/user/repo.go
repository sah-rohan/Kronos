package user

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/domain"
	"kronos/internal/platform/db"
)

// Repo reads and writes user identity, profile, and preferences.
type Repo struct {
	pool *pgxpool.Pool
}

// NewRepo wires the repository to the shared connection pool.
func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (p *Repo) EnsureUser(ctx context.Context, clerkID, displayName, email string) (domain.User, error) {
	var u domain.User
	// Everyone is auto-approved (a member) the moment they sign in. LeetCode
	// participation is gated separately on having linked a LeetCode username.
	err := p.pool.QueryRow(ctx, `
		insert into users (clerk_id, display_name, email, status)
		values ($1, coalesce(nullif($2, ''), $1), nullif($3, ''), 'approved')
		on conflict (clerk_id) do update set
			display_name = case when nullif($2, '') is not null then $2 else users.display_name end,
			email = coalesce(nullif($3, ''), users.email),
			status = 'approved'
		returning id::text, clerk_id, coalesce(leetcode_user::text, ''), coalesce(github_user, ''), display_name, coalesce(email, ''), status, role, coalesce(theme, 'auto')`,
		clerkID, displayName, email,
	).Scan(&u.ID, &u.ClerkID, &u.LeetcodeUser, &u.GithubUser, &u.DisplayName, &u.Email, &u.Status, &u.Role, &u.Theme)
	return u, err
}

func (p *Repo) SetTheme(ctx context.Context, userID, theme string) error {
	if theme != "auto" && theme != "light" && theme != "dark" {
		theme = "auto"
	}
	_, err := p.pool.Exec(ctx, `update users set theme = $2 where id = $1`, userID, theme)
	return err
}

func (p *Repo) SetUsername(ctx context.Context, userID, leetcodeUser string) error {
	// Applying a username also clears any pending request for it.
	_, err := p.pool.Exec(ctx,
		`update users set leetcode_user = $2, requested_username = null where id = $1`,
		userID, leetcodeUser)
	if db.IsUniqueViolation(err) {
		return domain.ErrUsernameTaken
	}
	return err
}

// RequestUsername records a user's desired LeetCode username for admin review.
func (p *Repo) RequestUsername(ctx context.Context, userID, leetcodeUser string) error {
	_, err := p.pool.Exec(ctx,
		`update users set requested_username = $2 where id = $1`, userID, leetcodeUser)
	return err
}

func (p *Repo) SetProfile(ctx context.Context, userID, leetcodeUser, githubUser string) error {
	_, err := p.pool.Exec(ctx,
		`update users set leetcode_user = $2, github_user = $3 where id = $1`,
		userID, leetcodeUser, githubUser)
	if db.IsUniqueViolation(err) {
		return domain.ErrUsernameTaken
	}
	return err
}

func (p *Repo) MakeAdmin(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `update users set status = 'approved', role = 'admin' where id = $1`, userID)
	return err
}

func (p *Repo) RecordVisit(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `insert into visits (user_id) values ($1)`, userID)
	return err
}
