package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/leetcode"
	"kronos/internal/poller"
)

type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(ctx context.Context, dsn string) (*Postgres, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	return &Postgres{pool: pool}, nil
}

func (p *Postgres) Close() { p.pool.Close() }

func (p *Postgres) Catalog(ctx context.Context) (poller.Catalog, error) {
	rows, err := p.pool.Query(ctx, `select slug, id from problems`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	catalog := poller.Catalog{}
	for rows.Next() {
		var slug string
		var id int
		if err := rows.Scan(&slug, &id); err != nil {
			return nil, err
		}
		catalog[slug] = id
	}
	return catalog, rows.Err()
}

func (p *Postgres) DueMembers(ctx context.Context, limit int) ([]poller.Member, error) {
	rows, err := p.pool.Query(ctx, `
		select u.id, u.leetcode_user::text
		from users u
		left join sync_state s on s.user_id = u.id
		where u.leetcode_user is not null
		  and u.status = 'approved'
		  and (s.next_poll_at is null or s.next_poll_at <= now())
		order by s.next_poll_at nulls first
		limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var members []poller.Member
	for rows.Next() {
		var member poller.Member
		if err := rows.Scan(&member.UserID, &member.LeetCodeUser); err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, rows.Err()
}

func (p *Postgres) LoadState(ctx context.Context, userID string) (poller.State, error) {
	var state poller.State
	err := p.pool.QueryRow(ctx,
		`select last_ac_count, last_seen_ac_ts, next_poll_at from sync_state where user_id = $1`, userID).
		Scan(&state.LastCount, &state.LastSeenAt, &state.NextPollAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return poller.State{}, nil
	}
	return state, err
}

func (p *Postgres) SaveState(ctx context.Context, userID string, state poller.State) error {
	_, err := p.pool.Exec(ctx, `
		insert into sync_state (user_id, last_ac_count, last_seen_ac_ts, next_poll_at, last_polled_at)
		values ($1, $2, $3, $4, now())
		on conflict (user_id) do update set
			last_ac_count = excluded.last_ac_count,
			last_seen_ac_ts = excluded.last_seen_ac_ts,
			next_poll_at = excluded.next_poll_at,
			last_polled_at = now()`,
		userID, state.LastCount, state.LastSeenAt, state.NextPollAt)
	return err
}

func (p *Postgres) RecordSolve(ctx context.Context, solve poller.Solve) error {
	if _, err := p.pool.Exec(ctx, `
		insert into solves (user_id, problem_id, first_season_ac_at, season_ac_count, submission_id)
		values ($1, $2, to_timestamp($3), 1, $4)
		on conflict (user_id, problem_id) do update set
			first_season_ac_at = least(solves.first_season_ac_at, excluded.first_season_ac_at),
			season_ac_count = solves.season_ac_count + 1,
			submission_id = excluded.submission_id`,
		solve.UserID, solve.ProblemID, solve.SolvedAt, solve.SubmissionID); err != nil {
		return err
	}
	_, err := p.pool.Exec(ctx, `
		insert into submissions (submission_id, user_id, problem_id, solved_at)
		values ($1, $2, $3, to_timestamp($4))
		on conflict (submission_id) do nothing`,
		solve.SubmissionID, solve.UserID, solve.ProblemID, solve.SolvedAt)
	return err
}

func (p *Postgres) FlagOverflow(ctx context.Context, userID string, missing int) error {
	_, err := p.pool.Exec(ctx,
		`insert into pending_confirmations (user_id, missing_count) values ($1, $2)`,
		userID, missing)
	return err
}

func (p *Postgres) PendingEnrichment(ctx context.Context, limit int) ([]poller.Pending, error) {
	rows, err := p.pool.Query(ctx, `
		select user_id, problem_id, submission_id
		from submissions
		where not enriched
		order by solved_at
		limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var pending []poller.Pending
	for rows.Next() {
		var item poller.Pending
		if err := rows.Scan(&item.UserID, &item.ProblemID, &item.SubmissionID); err != nil {
			return nil, err
		}
		pending = append(pending, item)
	}
	return pending, rows.Err()
}

func (p *Postgres) SaveDetail(ctx context.Context, pending poller.Pending, detail leetcode.SubmissionDetail) error {
	if detail.Language != "" {
		if _, err := p.pool.Exec(ctx, `
			insert into solutions (user_id, problem_id, lang, code, runtime_ms, memory_kb, runtime_pct, is_optimal)
			values ($1, $2, $3, $4, $5, $6, $7, $8)
			on conflict (user_id, problem_id, lang) do update set
				code = excluded.code, runtime_ms = excluded.runtime_ms, memory_kb = excluded.memory_kb,
				runtime_pct = excluded.runtime_pct, is_optimal = excluded.is_optimal, updated_at = now()
			where excluded.runtime_pct >= solutions.runtime_pct`,
			pending.UserID, pending.ProblemID, detail.Language, detail.Code,
			detail.Runtime, detail.Memory, detail.RuntimePercentile,
			leetcode.IsOptimal(detail.RuntimePercentile)); err != nil {
			return err
		}
	}
	_, err := p.pool.Exec(ctx,
		`update submissions set enriched = true where submission_id = $1`, pending.SubmissionID)
	return err
}
