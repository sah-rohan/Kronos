package progress

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/domain"
)

// Repo runs the LeetCode progress queries: rankings, roadmaps, calendars,
// and stored solutions.
type Repo struct {
	pool *pgxpool.Pool
}

// NewRepo wires the repository to the shared connection pool.
func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (p *Repo) Leaderboard(ctx context.Context, limit int) ([]LeaderRow, error) {
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

func (p *Repo) Progress(ctx context.Context, userID string) ([]ProblemRow, error) {
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

func (p *Repo) Recent(ctx context.Context, limit int) ([]RecentRow, error) {
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

// CalendarProblems lists every problem the user solved this season with its UTC
// solve date, so the calendar can show what was done on a given day.
func (p *Repo) CalendarProblems(ctx context.Context, userID string) ([]CalendarProblem, error) {
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

func (p *Repo) CircleDifficulty(ctx context.Context, userID string) ([]DifficultyTotal, error) {
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

func (p *Repo) GroupDifficulty(ctx context.Context) ([]DifficultyTotal, error) {
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

func (p *Repo) Calendar(ctx context.Context, userID string) ([]domain.DayCount, error) {
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
	out := []domain.DayCount{}
	for rows.Next() {
		var c domain.DayCount
		if err := rows.Scan(&c.Date, &c.Count); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (p *Repo) Solutions(ctx context.Context, ownerID, slug string, recent bool) ([]SolutionRow, error) {
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
