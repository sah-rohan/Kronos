package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

type User struct {
	ID           string `json:"id"`
	ClerkID      string `json:"-"`
	LeetcodeUser string `json:"username"`
	GithubUser   string `json:"github"`
	DisplayName  string `json:"name"`
	Status       string `json:"status"`
	Role         string `json:"role"`
}

type LeaderRow struct {
	Rank         int    `json:"rank"`
	Name         string `json:"name"`
	LeetcodeUser string `json:"username"`
	Solved       int    `json:"solved"`
}

type FriendRow struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	LeetcodeUser string `json:"username"`
	Solved       int    `json:"solved"`
}

type ProblemRow struct {
	Slug       string `json:"slug"`
	Title      string `json:"title"`
	Difficulty string `json:"difficulty"`
	Category   string `json:"category"`
	Done       bool   `json:"done"`
	Optimal    bool   `json:"optimal"`
}

type SolutionRow struct {
	Slug      string `json:"slug"`
	Lang      string `json:"lang"`
	Code      string `json:"code"`
	RuntimeMs int    `json:"runtimeMs"`
	RuntimePct float64 `json:"runtimePct"` 
	Optimal   bool   `json:"optimal"`
}

var ErrNotFound = errors.New("not found")
var ErrUsernameTaken = errors.New("leetcode username already taken")

func (p *Postgres) EnsureUser(ctx context.Context, clerkID, displayName string) (User, error) {
	var u User
	err := p.pool.QueryRow(ctx, `
		insert into users (clerk_id, display_name)
		values ($1, coalesce(nullif($2, ''), $1))
		on conflict (clerk_id) do update set
			display_name = case when nullif($2, '') is not null then $2 else users.display_name end
		returning id::text, clerk_id, coalesce(leetcode_user::text, ''), coalesce(github_user, ''), display_name, status, role`,
		clerkID, displayName,
	).Scan(&u.ID, &u.ClerkID, &u.LeetcodeUser, &u.GithubUser, &u.DisplayName, &u.Status, &u.Role)
	return u, err
}

func (p *Postgres) SetUsername(ctx context.Context, userID, leetcodeUser string) error {
	_, err := p.pool.Exec(ctx, `update users set leetcode_user = $2 where id = $1`, userID, leetcodeUser)
	if isUniqueViolation(err) {
		return ErrUsernameTaken
	}
	return err
}

func (p *Postgres) SetProfile(ctx context.Context, userID, leetcodeUser, githubUser string) error {
	_, err := p.pool.Exec(ctx,
		`update users set leetcode_user = $2, github_user = $3 where id = $1`,
		userID, leetcodeUser, githubUser)
	if isUniqueViolation(err) {
		return ErrUsernameTaken
	}
	return err
}

func (p *Postgres) ListPending(ctx context.Context) ([]User, error) {
	rows, err := p.pool.Query(ctx, `
		select id::text, coalesce(leetcode_user::text, ''), coalesce(github_user, ''), display_name, status, role
		from users where status = 'pending' order by created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.LeetcodeUser, &u.GithubUser, &u.DisplayName, &u.Status, &u.Role); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (p *Postgres) Approve(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `update users set status = 'approved' where id = $1`, userID)
	return err
}

func (p *Postgres) DeleteUser(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `delete from users where id = $1`, userID)
	return err
}

func (p *Postgres) Leaderboard(ctx context.Context, limit int) ([]LeaderRow, error) {
	rows, err := p.pool.Query(ctx, `
		select u.display_name, coalesce(u.leetcode_user::text, ''),
		       count(s.problem_id) filter (where s.first_season_ac_at is not null) as solved
		from users u
		left join solves s on s.user_id = u.id
		where u.status = 'approved'
		group by u.id
		order by solved desc
		limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []LeaderRow{}
	rank := 0
	for rows.Next() {
		rank++
		r := LeaderRow{Rank: rank}
		if err := rows.Scan(&r.Name, &r.LeetcodeUser, &r.Solved); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (p *Postgres) Progress(ctx context.Context, userID string) ([]ProblemRow, error) {
	rows, err := p.pool.Query(ctx, `
		select pr.slug, pr.title, pr.difficulty, pr.category,
		       (s.first_season_ac_at is not null) as done,
		       exists (
		         select 1 from solutions so
		         where so.user_id = $1 and so.problem_id = pr.id and so.is_optimal
		       ) as optimal
		from problems pr
		left join solves s on s.problem_id = pr.id and s.user_id = $1
		order by pr.id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []ProblemRow{}
	for rows.Next() {
		var r ProblemRow
		if err := rows.Scan(&r.Slug, &r.Title, &r.Difficulty, &r.Category, &r.Done, &r.Optimal); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

type RecentRow struct {
	Number     int      `json:"n"`
	Name       string   `json:"name"`
	Difficulty string   `json:"diff"`
	Who        []string `json:"who"`
}

func (p *Postgres) Recent(ctx context.Context, limit int) ([]RecentRow, error) {
	rows, err := p.pool.Query(ctx, `
		select pr.id, pr.title, pr.difficulty, array_agg(u.display_name order by s.first_season_ac_at desc)
		from solves s
		join problems pr on pr.id = s.problem_id
		join users u on u.id = s.user_id
		where s.first_season_ac_at is not null and u.status = 'approved'
		group by pr.id, pr.title, pr.difficulty
		order by max(s.first_season_ac_at) desc
		limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RecentRow{}
	for rows.Next() {
		var r RecentRow
		if err := rows.Scan(&r.Number, &r.Name, &r.Difficulty, &r.Who); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

type DayCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func (p *Postgres) Calendar(ctx context.Context, userID string) ([]DayCount, error) {
	rows, err := p.pool.Query(ctx, `
		select to_char(first_season_ac_at, 'YYYY-MM-DD') as d, count(*)
		from solves
		where user_id = $1 and first_season_ac_at is not null
		group by d
		order by d`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []DayCount{}
	for rows.Next() {
		var c DayCount
		if err := rows.Scan(&c.Date, &c.Count); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (p *Postgres) Friends(ctx context.Context, userID string) ([]FriendRow, error) {
	rows, err := p.pool.Query(ctx, `
		select f.friend_id::text, u.display_name, coalesce(u.leetcode_user::text, ''),
		       count(s.problem_id) filter (where s.first_season_ac_at is not null) as solved
		from friendships f
		join users u on u.id = f.friend_id
		left join solves s on s.user_id = f.friend_id
		where f.user_id = $1
		group by f.friend_id, u.display_name, u.leetcode_user
		order by solved desc`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []FriendRow{}
	for rows.Next() {
		var r FriendRow
		if err := rows.Scan(&r.ID, &r.Name, &r.LeetcodeUser, &r.Solved); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (p *Postgres) AddFriend(ctx context.Context, userID, friendUsername string) error {
	var friendID string
	err := p.pool.QueryRow(ctx,
		`select id::text from users where leetcode_user = $1 and status = 'approved'`, friendUsername,
	).Scan(&friendID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx,
		`insert into friendships (user_id, friend_id) values ($1, $2) on conflict do nothing`,
		userID, friendID)
	return err
}

func (p *Postgres) RemoveFriend(ctx context.Context, userID, friendID string) error {
	_, err := p.pool.Exec(ctx, `delete from friendships where user_id = $1 and friend_id = $2`, userID, friendID)
	return err
}

func (p *Postgres) areFriends(ctx context.Context, userID, friendID string) (bool, error) {
	var exists bool
	err := p.pool.QueryRow(ctx,
		`select exists(select 1 from friendships where user_id = $1 and friend_id = $2)`, userID, friendID,
	).Scan(&exists)
	return exists, err
}

func (p *Postgres) FriendProgress(ctx context.Context, userID, friendID string) ([]ProblemRow, error) {
	ok, err := p.areFriends(ctx, userID, friendID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotFound
	}
	return p.Progress(ctx, friendID)
}

func (p *Postgres) MySolution(ctx context.Context, userID, slug string) ([]SolutionRow, error) {
	return p.solutions(ctx, userID, slug)
}

func (p *Postgres) FriendSolution(ctx context.Context, userID, friendID, slug string) ([]SolutionRow, error) {
	ok, err := p.areFriends(ctx, userID, friendID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotFound
	}
	return p.solutions(ctx, friendID, slug)
}

func (p *Postgres) solutions(ctx context.Context, ownerID, slug string) ([]SolutionRow, error) {
	rows, err := p.pool.Query(ctx, `
		select pr.slug, s.lang, s.code, s.runtime_ms, s.runtime_pct, s.is_optimal
		from solutions s
		join problems pr on pr.id = s.problem_id
		where s.user_id = $1 and pr.slug = $2
		order by s.is_optimal desc, s.runtime_pct desc, s.lang`, ownerID, slug)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SolutionRow{}
	for rows.Next() {
		var s SolutionRow
		if err := rows.Scan(&s.Slug, &s.Lang, &s.Code, &s.RuntimeMs, &s.RuntimePct, &s.Optimal); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func isUniqueViolation(err error) bool {
	var pgErr interface{ SQLState() string }
	if errors.As(err, &pgErr) {
		return pgErr.SQLState() == "23505"
	}
	return false
}
