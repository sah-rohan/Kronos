package interview

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

type Problem struct {
	Slug       string
	Title      string
	Difficulty string
	Category   string
}

// PickProblem prefers an unsolved NeetCode 150 problem from the member's
// weakest category, never one they were already interviewed on.
func (p *Repo) PickProblem(ctx context.Context, userID, difficulty string) (Problem, error) {
	var pr Problem
	err := p.pool.QueryRow(ctx, `
		with cat as (
			select pr.category,
			       count(s.problem_id)::float / count(*) as done
			from problems pr
			left join solves s on s.problem_id = pr.id and s.user_id = $1
			where pr.neetcode150
			group by pr.category
		)
		select pr.slug, pr.title, pr.difficulty, pr.category
		from problems pr
		left join cat on cat.category = pr.category
		where pr.difficulty = $2
		  and not exists (select 1 from interviews i
		                  where i.user_id = $1 and i.kind = 'coding' and i.subject = pr.slug)
		order by
		  exists (select 1 from solves s where s.user_id = $1 and s.problem_id = pr.id),
		  not pr.neetcode150,
		  coalesce(cat.done, 1),
		  random()
		limit 1`, userID, difficulty).
		Scan(&pr.Slug, &pr.Title, &pr.Difficulty, &pr.Category)
	if errors.Is(err, pgx.ErrNoRows) {
		return Problem{}, domain.ErrNotFound
	}
	return pr, err
}

func (p *Repo) UsedSubjects(ctx context.Context, userID, kind string) (map[string]bool, error) {
	rows, err := p.pool.Query(ctx,
		`select subject from interviews where user_id = $1 and kind = $2`, userID, kind)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]bool{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out[s] = true
	}
	return out, rows.Err()
}

func (p *Repo) StartedSince(ctx context.Context, userID string, since time.Time) (int, error) {
	var n int
	err := p.pool.QueryRow(ctx,
		`select count(*) from interviews where user_id = $1 and started_at >= $2`, userID, since).Scan(&n)
	return n, err
}

func (p *Repo) Create(ctx context.Context, userID string, iv Interview) (string, error) {
	var id string
	err := p.pool.QueryRow(ctx, `
		insert into interviews (user_id, kind, bar, difficulty, target, subject, title, briefing, minutes, language)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		returning id`,
		userID, iv.Kind, iv.Bar, iv.Difficulty, iv.Target, iv.Subject, iv.Title, iv.Briefing, iv.Minutes, iv.Language).
		Scan(&id)
	return id, err
}

// Delete removes an interview whose opening turn never arrived.
func (p *Repo) Delete(ctx context.Context, userID, id string) error {
	_, err := p.pool.Exec(ctx, `delete from interviews where id = $1 and user_id = $2`, id, userID)
	return err
}

func (p *Repo) List(ctx context.Context, userID string, limit int) ([]Summary, error) {
	rows, err := p.pool.Query(ctx, `
		select id, kind, bar, title, status, coalesce(verdict, ''), started_at
		from interviews where user_id = $1
		order by started_at desc limit $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Summary{}
	for rows.Next() {
		var s Summary
		var at time.Time
		if err := rows.Scan(&s.ID, &s.Kind, &s.Bar, &s.Title, &s.Status, &s.Verdict, &at); err != nil {
			return nil, err
		}
		s.StartedAt = at.Format(time.RFC3339)
		out = append(out, s)
	}
	return out, rows.Err()
}

// Get loads an interview with its turns. userID empty skips the owner check,
// which only the grader does.
func (p *Repo) Get(ctx context.Context, userID, id string) (Interview, error) {
	var iv Interview
	var started time.Time
	var ended *time.Time
	var debrief, problem, signals []byte
	err := p.pool.QueryRow(ctx, `
		select id, kind, bar, title, status, coalesce(verdict, ''), started_at, ended_at,
		       difficulty, target, subject, briefing, minutes, debrief,
		       language, problem, code, code_version, signals
		from interviews
		where id = $1 and ($2 = '' or user_id::text = $2)`, id, userID).
		Scan(&iv.ID, &iv.Kind, &iv.Bar, &iv.Title, &iv.Status, &iv.Verdict, &started, &ended,
			&iv.Difficulty, &iv.Target, &iv.Subject, &iv.Briefing, &iv.Minutes, &debrief,
			&iv.Language, &problem, &iv.Code, &iv.CodeVersion, &signals)
	if errors.Is(err, pgx.ErrNoRows) {
		return Interview{}, domain.ErrNotFound
	}
	if err != nil {
		return Interview{}, err
	}
	iv.StartedAt = started.Format(time.RFC3339)
	end := time.Now()
	if ended != nil {
		iv.EndedAt = ended.Format(time.RFC3339)
		end = *ended
	}
	iv.Elapsed = int(end.Sub(started).Seconds())
	if len(debrief) > 0 {
		iv.Debrief = &Debrief{}
		if err := json.Unmarshal(debrief, iv.Debrief); err != nil {
			return Interview{}, err
		}
	}
	if len(problem) > 0 {
		iv.Problem = &Statement{}
		if err := json.Unmarshal(problem, iv.Problem); err != nil {
			return Interview{}, err
		}
	}
	if len(signals) > 0 {
		if err := json.Unmarshal(signals, &iv.Signals); err != nil {
			return Interview{}, err
		}
	}

	rows, err := p.pool.Query(ctx, `
		select phase, role, content, code, created_at, unprompted, signals
		from interview_turns where interview_id = $1
		order by created_at, role desc`, id)
	if err != nil {
		return Interview{}, err
	}
	defer rows.Close()
	iv.Turns, iv.Followups = []Turn{}, []Turn{}
	for rows.Next() {
		var phase string
		var t Turn
		var at time.Time
		var sig []byte
		if err := rows.Scan(&phase, &t.Role, &t.Content, &t.Code, &at, &t.Unprompted, &sig); err != nil {
			return Interview{}, err
		}
		if len(sig) > 0 {
			if err := json.Unmarshal(sig, &t.Signals); err != nil {
				return Interview{}, err
			}
		}
		t.At = at.Format(time.RFC3339)
		if phase == PhaseFollowup {
			iv.Followups = append(iv.Followups, t)
		} else {
			iv.Turns = append(iv.Turns, t)
		}
	}
	return iv, rows.Err()
}

// AppendTurns stores the member's turn and the reply together; an empty
// question stores only the reply (an opening, or one spoken while watching).
// Non-nil signals become the interview's live read.
func (p *Repo) AppendTurns(ctx context.Context, id, phase, question, code, answer string, signals Signals, unprompted bool) error {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	now := time.Now()
	if question != "" || code != "" {
		if _, err := tx.Exec(ctx, `
			insert into interview_turns (interview_id, phase, role, content, code, created_at)
			values ($1, $2, 'user', $3, $4, $5)`, id, phase, question, code, now); err != nil {
			return err
		}
	}
	sig, err := signalsJSON(signals)
	if err != nil {
		return err
	}
	if answer != "" {
		if _, err := tx.Exec(ctx, `
			insert into interview_turns (interview_id, phase, role, content, created_at, signals, unprompted)
			values ($1, $2, 'assistant', $3, $4, $5, $6)`, id, phase, answer, now.Add(time.Millisecond), sig, unprompted); err != nil {
			return err
		}
	}
	if sig != nil {
		if _, err := tx.Exec(ctx, `update interviews set signals = $2 where id = $1`, id, sig); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func signalsJSON(s Signals) ([]byte, error) {
	if s == nil {
		return nil, nil
	}
	return json.Marshal(s)
}

func (p *Repo) SetProblem(ctx context.Context, id string, st Statement) error {
	raw, err := json.Marshal(st)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `update interviews set problem = $2 where id = $1`, id, raw)
	return err
}

func (p *Repo) ProblemBySlug(ctx context.Context, slug string) (Problem, error) {
	var pr Problem
	err := p.pool.QueryRow(ctx, `select slug, title, difficulty, category from problems where slug = $1`, slug).
		Scan(&pr.Slug, &pr.Title, &pr.Difficulty, &pr.Category)
	if errors.Is(err, pgx.ErrNoRows) {
		return Problem{}, domain.ErrNotFound
	}
	return pr, err
}

func (p *Repo) Owner(ctx context.Context, id string) (string, error) {
	var owner string
	err := p.pool.QueryRow(ctx, `select user_id from interviews where id = $1`, id).Scan(&owner)
	return owner, err
}

var ErrStale = errors.New("code changed since it was loaded")

func (p *Repo) SaveCode(ctx context.Context, userID, id string, in CodeInput) (int, error) {
	var version int
	err := p.pool.QueryRow(ctx, `
		update interviews set code = $3, language = $4, code_version = code_version + 1
		where id = $1 and user_id = $2 and kind = 'coding' and status = 'active' and code_version = $5
		returning code_version`, id, userID, in.Code, in.Language, in.Version).Scan(&version)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrStale
	}
	return version, err
}

// ClaimObservation reserves one watch check, at most one per gap and max per interview.
func (p *Repo) ClaimObservation(ctx context.Context, userID, id string, gap time.Duration, max int) (bool, error) {
	tag, err := p.pool.Exec(ctx, `
		update interviews set observed_at = now(), observations = observations + 1
		where id = $1 and user_id = $2 and kind = 'coding' and status = 'active' and observations < $4
		  and (observed_at is null or observed_at < now() - make_interval(secs => $3))`,
		id, userID, gap.Seconds(), max)
	return tag.RowsAffected() == 1, err
}

// GradedCoding returns the member's most recent graded coding interviews, newest first, skipping exclude.
func (p *Repo) GradedCoding(ctx context.Context, userID, exclude string, limit int) ([]graded, error) {
	rows, err := p.pool.Query(ctx, `
		select id, title, coalesce(ended_at, started_at), debrief
		from interviews
		where user_id = $1 and kind = 'coding' and status = 'graded' and id::text <> $2
		order by coalesce(ended_at, started_at) desc limit $3`, userID, exclude, limit)
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
		if err := json.Unmarshal(raw, &g.Debrief); err != nil {
			return nil, err
		}
		g.At = at.Format(time.RFC3339)
		out = append(out, g)
	}
	return out, rows.Err()
}

// MarkGrading moves an active, failed or stuck interview to grading. It reports
// false otherwise, so a double submit grades once.
func (p *Repo) MarkGrading(ctx context.Context, userID, id string) (bool, error) {
	tag, err := p.pool.Exec(ctx, `
		update interviews
		set status = 'grading', ended_at = coalesce(ended_at, now())
		where id = $1 and user_id = $2
		  and (status in ('active', 'failed') or (status = 'grading' and ended_at < now() - interval '15 minutes'))`, id, userID)
	return tag.RowsAffected() == 1, err
}

func (p *Repo) SaveDebrief(ctx context.Context, id string, d Debrief) error {
	raw, err := json.Marshal(d)
	if err != nil {
		return err
	}
	_, err = p.pool.Exec(ctx, `
		update interviews set status = 'graded', verdict = $2, debrief = $3
		where id = $1 and status = 'grading'`, id, d.Verdict, raw)
	return err
}

func (p *Repo) MarkFailed(ctx context.Context, id string) error {
	_, err := p.pool.Exec(ctx,
		`update interviews set status = 'failed' where id = $1 and status = 'grading'`, id)
	return err
}
