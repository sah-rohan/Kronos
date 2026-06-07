# Kronos backend (Go)

Fast, concurrent polling sync of LeetCode progress for a seasonal group leaderboard.

## Layout

```
internal/leetcode   public + authenticated LeetCode GraphQL client
internal/poller      sync engine (delta guard, concurrent fan-out) + enricher
internal/store       Postgres (pgx) implementation of the engine's interfaces
cmd/sync             Lambda: poll due members every minute
cmd/enrich           Lambda: fill runtime/code/optimal via one authed session
cmd/verify           local CLI: deterministic demo + live sync + auth detail
cmd/genseed          regenerate db/seed_problems.sql (NeetCode 150)
db/schema.sql        schema
db/seed_problems.sql NeetCode 150 (generated)
```

## How it syncs

`acSubmissionNum.All.submissions` (the accepted-submission count, which moves on
re-solves) is the cheap guard:

| delta | meaning | action |
|---|---|---|
| 0 | nothing accepted | back off |
| 1..20 | window holds them all | capture, zero misses |
| >20 | burst overflowed | flag confirmation |

At one-minute polling for active members, delta stays ≤ 20, so capture is
complete. A solve counts only when `timestamp >= season_start`.

## Run locally

```
go run ./cmd/verify                  # deterministic demo
go run ./cmd/verify lee215           # + live sync against a real user
LC_SESS=<cookie> go run ./cmd/verify # + authenticated submission detail
go run ./cmd/genseed                 # regenerate the 150 seed
```

## Env

```
DATABASE_URL=postgres://...
SEASON_START=<unix seconds>
LEETCODE_SESSION=<cookie for the enricher>
```
