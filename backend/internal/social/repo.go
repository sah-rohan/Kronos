package social

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kronos/internal/domain"
)

// Repo persists the friend graph: friendships, requests, and directory reads.
type Repo struct {
	pool *pgxpool.Pool
}

// NewRepo wires the repository to the shared connection pool.
func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (p *Repo) Friends(ctx context.Context, userID string) ([]FriendRow, error) {
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

func (p *Repo) SendFriendRequest(ctx context.Context, userID, friendUsername string) error {
	var targetID string
	err := p.pool.QueryRow(ctx,
		`select id::text from users where leetcode_user = $1 and status = 'approved' and active`, friendUsername,
	).Scan(&targetID)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	if err != nil {
		return err
	}
	if targetID == userID {
		return domain.ErrSelfFriend
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

func (p *Repo) IncomingRequests(ctx context.Context, userID string) ([]FriendRow, error) {
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

func (p *Repo) AcceptRequest(ctx context.Context, userID, requesterID string) error {
	var exists bool
	if err := p.pool.QueryRow(ctx,
		`select exists (select 1 from friend_requests where requester_id = $1 and target_id = $2)`,
		requesterID, userID,
	).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return domain.ErrNotFound
	}
	return p.acceptRequest(ctx, userID, requesterID)
}

func (p *Repo) acceptRequest(ctx context.Context, a, b string) error {
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

func (p *Repo) DeclineRequest(ctx context.Context, userID, requesterID string) error {
	_, err := p.pool.Exec(ctx,
		`delete from friend_requests where requester_id = $1 and target_id = $2`, requesterID, userID)
	return err
}

func (p *Repo) Directory(ctx context.Context, userID string) ([]FriendRow, error) {
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

func (p *Repo) RemoveFriend(ctx context.Context, userID, friendID string) error {
	_, err := p.pool.Exec(ctx,
		`delete from friendships where (user_id = $1 and friend_id = $2) or (user_id = $2 and friend_id = $1)`,
		userID, friendID)
	return err
}

func (p *Repo) AreFriends(ctx context.Context, userID, friendID string) (bool, error) {
	var exists bool
	err := p.pool.QueryRow(ctx,
		`select exists(select 1 from friendships where user_id = $1 and friend_id = $2)`, userID, friendID,
	).Scan(&exists)
	return exists, err
}
