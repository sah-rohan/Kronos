# Scratchpad

Status: built, not yet deployed · Owner: Rohan · Last updated: 2026-10-13

## Problem
Solving a problem silently is not what an interview tests. Interviewers judge
how you get there: did you clarify, consider a brute force, justify the
optimal approach, state complexity, and test your code. The scratchpad is a
place to solve a problem the way you would in an interview, with code and
plain-English reasoning side by side, and get graded on both. Grades over
time show whether those habits are improving.

## Scope
**In:**
- A pad per attempt at a catalog problem: an ordered list of **note** blocks
  (plain English) and **code** blocks, in one chosen language.
- Autosave while working; submit when done.
- Grading against a fixed rubric, with evidence that points at specific blocks.
- A progress view: each rubric area across your recent attempts, and how this
  attempt compares to your last.
- Redoing a problem as a new attempt.

**Non-goals:**
- Running code or test cases. The grader reasons about correctness and says
  so; see Open questions.
- A live AI conversation while you work. That is the coding interview; the pad
  is solo practice.
- Points, streaks or leaderboards. Progress is your own rubric over time.
- Problems outside the existing catalog (`problems` table).

## User flow
1. **Pick a problem.** On the Practice page (its own nav item), search the
   catalog, filtered by list and difficulty. Choose a language; it is remembered.
2. **Work.** The pad opens with the problem title, difficulty and a LeetCode
   link. It starts with one empty note block, prompting "Restate the problem
   and its constraints". Add note or code blocks in any order. Saved
   automatically.
3. **Submit.** The pad locks and shows "grading" (usually under a minute).
4. **Feedback.** An overall mark, the six rubric areas with evidence (each
   pointing to a block), a likely-correctness verdict, a complexity check, one
   block rewritten the way a strong candidate would, and the change since your
   last attempt.
5. **Progress.** Each rubric area across your last 10 graded pads, plus the area
   that has been weak most often. Redo any problem from here.

## Data model
`pads`, one row per attempt:

| Column | Why |
|---|---|
| `id uuid`, `user_id` | Owner; every query filters on it |
| `problem_id int → problems` | What is being solved; drives title, difficulty, category |
| `language text` | `python`, `java`, `cpp`, `javascript` or `go` |
| `blocks jsonb` | `[{kind: "note"\|"code", text, at}]`. `at` is when the block was created, so the grader can see whether reasoning came before code |
| `version int` | Bumped on every save; a stale save gets 409 so two tabs can't overwrite each other |
| `status text` | `draft` → `grading` → `graded`, or `failed` (same transitions as interviews) |
| `feedback jsonb` | Written by the grader |
| `overall text` | `weak`, `solid` or `strong`, copied out of `feedback` for lists |
| `started_at`, `submitted_at` | Time spent, and the daily submit limit |
| `queued_at` | When it was last sent to the grader; a pad stuck in `grading` 15 minutes past this can be resubmitted |

Indexes: `(user_id, started_at desc)` for the list;
`(user_id, problem_id) where status = 'draft'`, **unique**, so there is one open
draft per problem.

Blocks are one JSON column rather than a table because a pad is always read and
written whole, and autosave replaces it in one statement.

## API
All under `/me/pads`. Requires a Clerk JWT and an approved member. Each route sees only the caller's pads.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/me/pads` | | `{available, pads: Summary[]}`, newest 50 |
| POST | `/me/pads` | `{slug, language}` | `Pad`. Returns the existing draft if one is open for that problem |
| GET | `/me/pads/{id}` | | `Pad` with blocks and feedback |
| PUT | `/me/pads/{id}` | `{blocks, language, version}` | `{version}` |
| POST | `/me/pads/{id}/submit` | | `Pad` in `grading` |
| DELETE | `/me/pads/{id}` | | 204 |
| GET | `/me/pads/progress` | | Per area: last 10 marks with dates, plus the focus area |

| Status | When |
|---|---|
| 400 | Unknown problem or language, too many blocks, pad too large, submitting an empty pad |
| 404 | Not found or not the caller's |
| 409 | Stale `version` on save; saving or submitting a pad that isn't a draft |
| 429 | Daily submit limit |
| 503 | AI not configured |

`submit` is a POST sub-resource because it is a state transition, like
interviews' `end`.

## Grading
**Rubric.** Each area gets `strong`, `solid` or `weak` plus one sentence of
evidence that cites a block number:

| Area | Strong looks like |
|---|---|
| Understanding | Restates the problem, asks about input sizes and edge cases before solving |
| Approach | Names a brute force, explains why it is too slow, and justifies the better one |
| Code | Correct, readable, idiomatic for the language; no dead code |
| Complexity | Time and space stated, and correct |
| Testing | Traces at least one normal and one edge case through the code |
| Communication | Notes explain *why*, and come before or alongside the code rather than after |

**Feedback shape** (strict JSON schema, like the interview debrief):
`{overall, summary, rubric[{area, mark, evidence, block}], correctness{verdict:
likely_correct|likely_wrong|unclear, issues[]}, complexity{stated, actual,
agrees}, rewrite{block, stronger}, change, next[2]}`. `change` is one sentence
on how this attempt compares with the last three graded ones.

**What the grader sees:** the bar text, the problem (slug, title,
difficulty), the blocks numbered in order with minutes since start, and the
rubric from your last three graded pads. Pad content is fenced as data, never
instructions.

**Improvement over time:** marks map to 1/2/3. Progress returns each area's
last 10 marks. The focus area is the one marked weak most often in the last five
pads, and the grader is told it so `next` targets it. Nothing else, no score.

## Architecture
```
SPA (pad page, CodeMirror) ─→ CloudFront /api ─→ API Gateway ─→ api λ ──→ Postgres
                                                                  │
                                         submit ─→ SQS kronos-grade ─→ grade λ ──→ Azure OpenAI "deep" (via forge)
                                                                                 └─→ Postgres
```
- **AI through forge.** Grading uses the existing `internal/platform/ai`
  client, whose transport is forge's. On Lambda, forge takes the key from
  SSM; locally it uses `az login`. No new credentials or deployments: the
  grader uses the same `deep` deployment at `high` effort as interview debriefs.
- **Shared queue and Lambda.** The grade message gains a `type` field
  (`interview` | `pad`). The grade Lambda dispatches on it; a message with no
  type is an interview, so messages already queued still work.
- **New package** `internal/pad` (controller, service, repo, prompts, model),
  wired in `api.New` like every other feature.
- **Editor:** CodeMirror 6, loaded only on the pad page (about 98 KB gzipped),
  plus the one language you pick (9 to 34 KB). Monaco would be about 2 MB.
- **Autosave:** the client PUTs the whole pad 2 seconds after the last
  keystroke, and when leaving the page.

## Limits and security
| Limit | Value | Why |
|---|---|---|
| Submits per 24h | 10 | Azure cost |
| Blocks per pad | 60 | Prompt size |
| Pad size (all blocks) | 40 KB | Prompt size and cost |
| Feedback tokens | 8k | Cost and latency |
| Saves | Only while `draft` | Feedback is always for exactly what was submitted |

- Pads are private: no friend, group or admin view.
- Prompt injection in a pad can only skew that member's own feedback.
- Saves are plain database writes with no AI, so they need no rate limit
  beyond API Gateway's.

## Failure modes
| What fails | What happens |
|---|---|
| Autosave fails (offline) | The editor keeps local state, shows "not saved", retries; local copy in `localStorage` until saved |
| Two tabs edit one pad | The second save gets 409; that tab reloads the latest version |
| Grader returns invalid JSON | Retried once, then `failed`; Submit retries |
| Grade Lambda crashes or times out | SQS redelivers up to 3 times, then the DLQ alarm fires |
| Stuck in `grading` | Same fix as interviews: Submit retries rows in `grading` for more than 15 minutes |
| Problem removed from the catalog | FK prevents it; seeds only upsert |

## Rollout
1. Schema: `pads` table and indexes in `schema.sql` (idempotent), applied by the deploy.
2. Backend: `internal/pad`, the grade-message `type` field, and grade Lambda dispatch. No new infra.
3. Frontend: Practice page, pad page, feedback, progress. Starting a pad is disabled when `available` is false.
4. Rollback: hide the tab. The table can stay; unset Azure variables and the API answers 503.

Build order, each step shippable: data and API without grading, then the pad
page with autosave, then grading and feedback, then progress.

## Open questions
1. **Running code.** Judging correctness without running it is the weakest
   part. *Recommendation:* ship without it and label correctness "judged, not
   run". If it matters later, add a sandboxed runner (a separate Lambda per
   language with no network and no role permissions) using the problem's
   examples.
2. **Problem statements.** The catalog has titles, not statements.
   *Recommendation:* link to LeetCode for now. The grader knows catalog
   problems by slug. Later, cache statements from LeetCode's public GraphQL
   in a `problems.statement` column.
3. **The pad in coding interviews.** Your notes (`docs/notes/interview.md`)
   want a notepad you talk through during an interview. *Recommendation:* once
   this ships, replace the interview room's code box with this pad component,
   sending its blocks with each turn. One editor, two uses.
4. **Hints.** *Recommendation:* none in v1. Hints belong to the interview,
   where the interviewer controls them.

## Decision log
- 2026-10-12: Pads are a separate resource from interviews: solo, untimed, graded on process. They share the grade queue and Lambda.
- 2026-10-12: Blocks stored as one JSONB column, with a version number for safe autosave.
- 2026-10-12: No code execution in v1; correctness is judged and labelled as such.
- 2026-10-13: Practice is its own page in the nav, since the Interview page has no frontend yet. Pads start by problem slug, which the frontend already has.
- 2026-10-13: The grader's rubric is a JSON object with six fixed keys, not an array, so strict structured output always returns all six areas.
- 2026-10-13: Interviews and pads share one grade queue through `internal/platform/jobs`. Messages carry a `type`, and an untyped message is an interview.
- 2026-10-13: Each language mode is loaded only when picked, which halved the pad page's bundle.
