package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type User struct {
	ID                string `json:"id"`
	ClerkID           string `json:"-"`
	LeetcodeUser      string `json:"username"`
	GithubUser        string `json:"github"`
	DisplayName       string `json:"name"`
	Email             string `json:"email"`
	Status            string `json:"status"`
	Role              string `json:"role"`
	Theme             string `json:"theme"`
	RequestedUsername string `json:"requestedUsername"`
}

type LeaderRow struct {
	Name         string `json:"name"`
	LeetcodeUser string `json:"username"`
	Blind75      int    `json:"blind75"`
	Neetcode150  int    `json:"neetcode150"`
	Neetcode250  int    `json:"neetcode250"`
	All          int    `json:"all"`
	Easy         int    `json:"easy"`
	Medium       int    `json:"medium"`
	Hard         int    `json:"hard"`
}

type FriendRow struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	LeetcodeUser string `json:"username"`
	Solved       int    `json:"solved"`
}

type ProblemRow struct {
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Difficulty  string `json:"difficulty"`
	Category    string `json:"category"`
	Done        bool   `json:"done"`
	Optimal     bool   `json:"optimal"`
	Blind75     bool   `json:"blind75"`
	Neetcode150 bool   `json:"neetcode150"`
	Neetcode250 bool   `json:"neetcode250"`
}

type SolutionRow struct {
	Slug       string  `json:"slug"`
	Lang       string  `json:"lang"`
	Code       string  `json:"code"`
	RuntimeMs  int     `json:"runtimeMs"`
	RuntimePct float64 `json:"runtimePct"`
	Optimal    bool    `json:"optimal"`
}

var ErrNotFound = errors.New("not found")
var ErrSelfFriend = errors.New("cannot add yourself")
var ErrUsernameTaken = errors.New("leetcode username already taken")

func (p *Postgres) EnsureUser(ctx context.Context, clerkID, displayName, email string) (User, error) {
	var u User
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

func (p *Postgres) SetTheme(ctx context.Context, userID, theme string) error {
	if theme != "auto" && theme != "light" && theme != "dark" {
		theme = "auto"
	}
	_, err := p.pool.Exec(ctx, `update users set theme = $2 where id = $1`, userID, theme)
	return err
}

func (p *Postgres) SetUsername(ctx context.Context, userID, leetcodeUser string) error {
	// Applying a username also clears any pending request for it.
	_, err := p.pool.Exec(ctx,
		`update users set leetcode_user = $2, requested_username = null where id = $1`,
		userID, leetcodeUser)
	if isUniqueViolation(err) {
		return ErrUsernameTaken
	}
	return err
}

// RequestUsername records a user's desired LeetCode username for admin review.
func (p *Postgres) RequestUsername(ctx context.Context, userID, leetcodeUser string) error {
	_, err := p.pool.Exec(ctx,
		`update users set requested_username = $2 where id = $1`, userID, leetcodeUser)
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
		from users where status = 'pending' and active order by created_at`)
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

func (p *Postgres) AllUsers(ctx context.Context) ([]User, error) {
	rows, err := p.pool.Query(ctx, `
		select id::text, coalesce(leetcode_user::text, ''), coalesce(github_user, ''), display_name, coalesce(email, ''), status, role, coalesce(requested_username, '')
		from users
		where active
		order by (leetcode_user is null) desc, display_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.LeetcodeUser, &u.GithubUser, &u.DisplayName, &u.Email, &u.Status, &u.Role, &u.RequestedUsername); err != nil {
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

func (p *Postgres) MakeAdmin(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `update users set status = 'approved', role = 'admin' where id = $1`, userID)
	return err
}

func (p *Postgres) DeleteUser(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `update users set active = false where id = $1`, userID)
	return err
}

// PurgeUser hard-deletes a user and all their data (solves/solutions/friendships
// cascade). Used to reject a pending sign-up so the Clerk ID + LeetCode username
// free up and they can register again.
func (p *Postgres) PurgeUser(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `delete from users where id = $1`, userID)
	return err
}

type Analytics struct {
	Users    int        `json:"users"`    // active, approved members
	Pending  int        `json:"pending"`  // awaiting approval
	Solves   int        `json:"solves"`   // total season solves
	Solves7d int        `json:"solves7d"` // solves in the last 7 days
	Active7d int        `json:"active7d"` // distinct members who solved in last 7 days
	Views    int        `json:"views"`    // total app opens
	Views7d  int        `json:"views7d"`  // app opens in the last 7 days
	PerDay   []DayCount `json:"perDay"`   // solves per UTC day, last 14 days
}

// GetSetting reads an app-level setting (empty string if unset).
func (p *Postgres) GetSetting(ctx context.Context, key string) (string, error) {
	var v string
	err := p.pool.QueryRow(ctx, `select value from app_settings where key = $1`, key).Scan(&v)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return v, err
}

// SetSetting upserts an app-level setting.
func (p *Postgres) SetSetting(ctx context.Context, key, value string) error {
	_, err := p.pool.Exec(ctx,
		`insert into app_settings (key, value) values ($1, $2)
		 on conflict (key) do update set value = excluded.value`, key, value)
	return err
}

func (p *Postgres) RecordVisit(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `insert into visits (user_id) values ($1)`, userID)
	return err
}

func (p *Postgres) RecordSDSolve(ctx context.Context, userID, slug string) error {
	_, err := p.pool.Exec(ctx,
		`insert into sd_solves (user_id, slug) values ($1, $2) on conflict do nothing`,
		userID, slug)
	return err
}

func (p *Postgres) SDSolved(ctx context.Context, userID string) ([]string, error) {
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
func (p *Postgres) MySDActivity(ctx context.Context, userID string) ([]SDActivityRow, error) {
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

// SDActivityRow is one "user completed a module" event, newest first.
type SDActivityRow struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Slug     string `json:"slug"`
	At       string `json:"at"`
}

// SDActivity returns recent System Design module completions across approved
// users. kind filters by slug prefix ("design"/"genai"; empty = all). It never
// exposes any build/solution content - only that the module was solved.
func (p *Postgres) SDActivity(ctx context.Context, limit int, kind string) ([]SDActivityRow, error) {
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

type SDLeaderRow struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Count    int    `json:"count"`
}

// SDLeaderboard ranks approved users by how many modules they've completed.
// kind filters by slug prefix: "design" or "genai" (empty = all modules).
func (p *Postgres) SDLeaderboard(ctx context.Context, limit int, kind string) ([]SDLeaderRow, error) {
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

// Analytics returns group-usage aggregates for the admin dashboard. All counts
// are derived from existing data — no tracking, no external service.
func (p *Postgres) Analytics(ctx context.Context) (Analytics, error) {
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
	a.PerDay = []DayCount{}
	for rows.Next() {
		var dc DayCount
		if err := rows.Scan(&dc.Date, &dc.Count); err != nil {
			return a, err
		}
		a.PerDay = append(a.PerDay, dc)
	}
	return a, rows.Err()
}

func (p *Postgres) Leaderboard(ctx context.Context, limit int) ([]LeaderRow, error) {
	rows, err := p.pool.Query(ctx, `
		select u.display_name, coalesce(u.leetcode_user::text, ''),
		       count(*) filter (where pr.blind75) as b75,
		       count(*) filter (where pr.neetcode150) as n150,
		       count(*) filter (where pr.neetcode250) as n250,
		       count(pr.id) as total,
		       count(*) filter (where pr.difficulty = 'Easy') as easy,
		       count(*) filter (where pr.difficulty = 'Medium') as medium,
		       count(*) filter (where pr.difficulty = 'Hard') as hard
		from users u
		left join solves s on s.user_id = u.id and s.first_season_ac_at is not null
		left join problems pr on pr.id = s.problem_id
		where u.leetcode_user is not null and u.active
		group by u.id
		order by n150 desc
		limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []LeaderRow{}
	for rows.Next() {
		var r LeaderRow
		if err := rows.Scan(&r.Name, &r.LeetcodeUser, &r.Blind75, &r.Neetcode150, &r.Neetcode250, &r.All, &r.Easy, &r.Medium, &r.Hard); err != nil {
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
		       ) as optimal,
		       pr.blind75, pr.neetcode150, pr.neetcode250
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
		if err := rows.Scan(&r.Slug, &r.Title, &r.Difficulty, &r.Category, &r.Done, &r.Optimal, &r.Blind75, &r.Neetcode150, &r.Neetcode250); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

type RecentRow struct {
	Number     int      `json:"n"`
	Slug       string   `json:"slug"`
	Name       string   `json:"name"`
	Difficulty string   `json:"diff"`
	Who        []string `json:"who"`
	At         string   `json:"at"` // most recent solve, UTC YYYY-MM-DD
}

type DifficultyTotal struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

func (p *Postgres) Recent(ctx context.Context, limit int) ([]RecentRow, error) {
	rows, err := p.pool.Query(ctx, `
		select pr.id, pr.slug, pr.title, pr.difficulty,
		       array_agg(u.display_name order by s.first_season_ac_at asc),
		       to_char(max(s.first_season_ac_at) at time zone 'UTC', 'YYYY-MM-DD')
		from solves s
		join problems pr on pr.id = s.problem_id
		join users u on u.id = s.user_id
		where s.first_season_ac_at is not null and u.leetcode_user is not null and u.active
		group by pr.id, pr.slug, pr.title, pr.difficulty
		order by max(s.first_season_ac_at) desc
		limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RecentRow{}
	for rows.Next() {
		var r RecentRow
		if err := rows.Scan(&r.Number, &r.Slug, &r.Name, &r.Difficulty, &r.Who, &r.At); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

type CalendarProblem struct {
	Date       string `json:"date"` // UTC YYYY-MM-DD
	Slug       string `json:"slug"`
	Title      string `json:"title"`
	Difficulty string `json:"difficulty"`
}

// CalendarProblems lists every problem the user solved this season with its UTC
// solve date, so the calendar can show what was done on a given day.
func (p *Postgres) CalendarProblems(ctx context.Context, userID string) ([]CalendarProblem, error) {
	rows, err := p.pool.Query(ctx, `
		select to_char(s.first_season_ac_at at time zone 'UTC', 'YYYY-MM-DD'),
		       pr.slug, pr.title, pr.difficulty
		from solves s
		join problems pr on pr.id = s.problem_id
		where s.user_id = $1 and s.first_season_ac_at is not null
		order by s.first_season_ac_at desc`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []CalendarProblem{}
	for rows.Next() {
		var c CalendarProblem
		if err := rows.Scan(&c.Date, &c.Slug, &c.Title, &c.Difficulty); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (p *Postgres) CircleDifficulty(ctx context.Context, userID string) ([]DifficultyTotal, error) {
	rows, err := p.pool.Query(ctx, `
		select pr.difficulty, count(*)
		from solves s
		join problems pr on pr.id = s.problem_id
		where s.first_season_ac_at is not null
		  and (s.user_id = $1 or s.user_id in (select friend_id from friendships where user_id = $1))
		group by pr.difficulty`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	totals := map[string]int{"Easy": 0, "Medium": 0, "Hard": 0}
	for rows.Next() {
		var label string
		var count int
		if err := rows.Scan(&label, &count); err != nil {
			return nil, err
		}
		totals[label] = count
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return []DifficultyTotal{
		{Label: "Easy", Count: totals["Easy"]},
		{Label: "Medium", Count: totals["Medium"]},
		{Label: "Hard", Count: totals["Hard"]},
	}, nil
}

func (p *Postgres) GroupDifficulty(ctx context.Context) ([]DifficultyTotal, error) {
	rows, err := p.pool.Query(ctx, `
		select pr.difficulty, count(*)
		from solves s
		join problems pr on pr.id = s.problem_id
		join users u on u.id = s.user_id
		where s.first_season_ac_at is not null and u.leetcode_user is not null and u.active
		group by pr.difficulty`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	totals := map[string]int{"Easy": 0, "Medium": 0, "Hard": 0}
	for rows.Next() {
		var label string
		var count int
		if err := rows.Scan(&label, &count); err != nil {
			return nil, err
		}
		totals[label] = count
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return []DifficultyTotal{
		{Label: "Easy", Count: totals["Easy"]},
		{Label: "Medium", Count: totals["Medium"]},
		{Label: "Hard", Count: totals["Hard"]},
	}, nil
}

type DayCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func (p *Postgres) Calendar(ctx context.Context, userID string) ([]DayCount, error) {
	rows, err := p.pool.Query(ctx, `
		select to_char(first_season_ac_at at time zone 'UTC', 'YYYY-MM-DD') as d, count(*)
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
		where f.user_id = $1 and u.active
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

func (p *Postgres) SendFriendRequest(ctx context.Context, userID, friendUsername string) error {
	var targetID string
	err := p.pool.QueryRow(ctx,
		`select id::text from users where leetcode_user = $1 and status = 'approved' and active`, friendUsername,
	).Scan(&targetID)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if targetID == userID {
		return ErrSelfFriend
	}

	var reverseExists bool
	if err := p.pool.QueryRow(ctx,
		`select exists (select 1 from friend_requests where requester_id = $1 and target_id = $2)`,
		targetID, userID,
	).Scan(&reverseExists); err != nil {
		return err
	}
	if reverseExists {
		return p.acceptRequest(ctx, userID, targetID)
	}

	_, err = p.pool.Exec(ctx,
		`insert into friend_requests (requester_id, target_id) values ($1, $2) on conflict do nothing`,
		userID, targetID)
	return err
}

func (p *Postgres) IncomingRequests(ctx context.Context, userID string) ([]FriendRow, error) {
	rows, err := p.pool.Query(ctx, `
		select u.id::text, u.display_name, coalesce(u.leetcode_user::text, ''),
		       count(s.problem_id) filter (where s.first_season_ac_at is not null) as solved
		from friend_requests fr
		join users u on u.id = fr.requester_id
		left join solves s on s.user_id = fr.requester_id
		where fr.target_id = $1 and u.active
		group by u.id, u.display_name, u.leetcode_user
		order by u.display_name`, userID)
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

func (p *Postgres) AcceptRequest(ctx context.Context, userID, requesterID string) error {
	var exists bool
	if err := p.pool.QueryRow(ctx,
		`select exists (select 1 from friend_requests where requester_id = $1 and target_id = $2)`,
		requesterID, userID,
	).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return p.acceptRequest(ctx, userID, requesterID)
}

func (p *Postgres) acceptRequest(ctx context.Context, a, b string) error {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx,
		`delete from friend_requests where (requester_id = $1 and target_id = $2) or (requester_id = $2 and target_id = $1)`,
		a, b); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`insert into friendships (user_id, friend_id) values ($1, $2), ($2, $1) on conflict do nothing`,
		a, b); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (p *Postgres) DeclineRequest(ctx context.Context, userID, requesterID string) error {
	_, err := p.pool.Exec(ctx,
		`delete from friend_requests where requester_id = $1 and target_id = $2`, requesterID, userID)
	return err
}

func (p *Postgres) Directory(ctx context.Context, userID string) ([]FriendRow, error) {
	rows, err := p.pool.Query(ctx, `
		select u.id::text, u.display_name, coalesce(u.leetcode_user::text, ''),
		       count(s.problem_id) filter (where s.first_season_ac_at is not null) as solved
		from users u
		left join solves s on s.user_id = u.id
		where u.leetcode_user is not null and u.active and u.id <> $1
		  and u.leetcode_user is not null
		  and not exists (select 1 from friendships f where f.user_id = $1 and f.friend_id = u.id)
		  and not exists (select 1 from friend_requests r where r.requester_id = $1 and r.target_id = u.id)
		group by u.id, u.display_name, u.leetcode_user
		order by u.display_name`, userID)
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

func (p *Postgres) RemoveFriend(ctx context.Context, userID, friendID string) error {
	_, err := p.pool.Exec(ctx,
		`delete from friendships where (user_id = $1 and friend_id = $2) or (user_id = $2 and friend_id = $1)`,
		userID, friendID)
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

func (p *Postgres) FriendCalendar(ctx context.Context, userID, friendID string) ([]DayCount, error) {
	ok, err := p.areFriends(ctx, userID, friendID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotFound
	}
	return p.Calendar(ctx, friendID)
}

func (p *Postgres) FriendCalendarProblems(ctx context.Context, userID, friendID string) ([]CalendarProblem, error) {
	ok, err := p.areFriends(ctx, userID, friendID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotFound
	}
	return p.CalendarProblems(ctx, friendID)
}

func (p *Postgres) MySolution(ctx context.Context, userID, slug string, recent bool) ([]SolutionRow, error) {
	return p.solutions(ctx, userID, slug, recent)
}

func (p *Postgres) FriendSolution(ctx context.Context, userID, friendID, slug string, recent bool) ([]SolutionRow, error) {
	ok, err := p.areFriends(ctx, userID, friendID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrNotFound
	}
	return p.solutions(ctx, friendID, slug, recent)
}

func (p *Postgres) solutions(ctx context.Context, ownerID, slug string, recent bool) ([]SolutionRow, error) {
	query := `
		select slug, lang, code, runtime_ms, runtime_pct, is_optimal from (
			select distinct on (s.lang)
				pr.slug, s.lang, s.code, s.runtime_ms, s.runtime_pct, s.is_optimal, s.solved_at
			from solutions s
			join problems pr on pr.id = s.problem_id
			where s.user_id = $1 and pr.slug = $2
			order by s.lang, s.is_optimal desc, s.runtime_pct desc
		) t
		order by t.is_optimal desc, t.runtime_pct desc`
	if recent {
		query = `
			select slug, lang, code, runtime_ms, runtime_pct, is_optimal from (
				select distinct on (s.code)
					pr.slug, s.lang, s.code, s.runtime_ms, s.runtime_pct, s.is_optimal, s.solved_at
				from solutions s
				join problems pr on pr.id = s.problem_id
				where s.user_id = $1 and pr.slug = $2
				order by s.code, s.solved_at desc
			) t
			order by t.solved_at desc`
	}
	rows, err := p.pool.Query(ctx, query, ownerID, slug)
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
