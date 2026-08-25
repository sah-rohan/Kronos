// Package db owns the Postgres connection pool. Feature repositories take the
// pool and run their own SQL; nothing here knows about any particular table,
// which is what lets each feature keep its queries to itself.
package db

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Open dials Postgres and returns the pool shared by every feature repository.
func Open(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	return pgxpool.New(ctx, dsn)
}

// IsUniqueViolation reports whether err is a Postgres 23505, so callers can
// turn a racing insert into a domain error instead of a 500.
func IsUniqueViolation(err error) bool {
	var pgErr interface{ SQLState() string }
	if errors.As(err, &pgErr) {
		return pgErr.SQLState() == "23505"
	}
	return false
}
