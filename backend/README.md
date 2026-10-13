# Kronos backend (Go)

Fast, concurrent polling sync of LeetCode progress for a seasonal group leaderboard.

## Layout

```
internal/leetcode   public + authenticated LeetCode GraphQL client
internal/career      resumes + the roles a member is applying to
internal/coach       the AI coach: assembles a member's record into a prompt
internal/interview   mock interviews: live turns, then an SQS-graded debrief
internal/platform/jobs  the shared grade queue (SQS), typed by feature
internal/platform/ai Azure OpenAI client (auth via the forge library)
internal/poller      sync engine (delta guard, concurrent fan-out) + enricher
internal/store       Postgres (pgx) implementation of the engine's interfaces
cmd/sync             Lambda: poll due members every minute
cmd/enrich           Lambda: fill runtime/code/optimal via one authed session
cmd/grade            Lambda: grade queued interviews
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

AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=balanced        # the deployment name, not the model
AZURE_OPENAI_EFFORT=medium              # low | medium | high
AZURE_OPENAI_KEY=<key>                  # in AWS, read from SSM instead
```

Leave the Azure variables unset and everything still runs; only `/me/coach/chat`
answers 503.

## The coach

`internal/coach` is the only feature that reaches outside the database. On each
question it gathers the member's own record - every problem they solved, their
accepted code for the most recent (plus any the question names by title), the
modules they finished, their primary resume, and the role they are targeting -
renders it as one context block, and sends it to Azure OpenAI with the last few
turns of that thread. A thread is `(user, job)`: one per role they are applying
to, plus one for general prep.

Credentials are never handled here. `internal/platform/ai` hands an
`*http.Client` from [forge](https://github.com/sah-rohan/forge), which resolves
a managed identity, a workload identity, or a key, and refreshes it in the
background. On Lambda there is no Azure identity to reach, so the key comes from
SSM; locally, set `AZURE_OPENAI_KEY`.
