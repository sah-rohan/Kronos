# Mock interviews

Status: backend built, frontend not started · Owner: Rohan · Last updated: 2026-10-12

## Problem
Interview prep is the part people avoid. Kronos members already track what they
solve; this lets them rehearse the interview itself against an AI interviewer
that holds a high bar, then get a written debrief they can question. It should
feel like a real loop, not a game.

## Scope
**In:**
- Four kinds: `resume` (opens from the member's resume), `coding`, `behavioral`, `design`.
- Two bars: `top` (top-tier new-grad loop, the default) and `standard`.
- A timed, typed conversation; the candidate can share code with a message.
- A graded debrief: verdict, rubric with evidence, one "stronger answer" moment, next steps.
- Follow-up questions about the debrief.

**Non-goals:**
- Voice (later; see Open questions).
- Points, streaks, leaderboards or any gamification.
- Sharing interviews with friends or admins; an interview is private to its owner.
- A job board or company-specific question banks.

## User flow
Mockups: https://claude.ai/artifact/UKaeBHPocuT1cXt4gmw6W1

1. **Start.** The member picks a kind, a bar and (for coding) a difficulty, and
   optionally a target role. The interviewer's opening message is returned with
   the new interview.
2. **Interview room.** The member types answers, optionally with code. A clock
   shows elapsed vs. allotted minutes (resume 40, coding 45, behavioral 30,
   design 45).
3. **End.** The member ends the interview. It shows "grading" while the debrief
   is written in the background (the UI polls `GET /me/interviews/{id}`).
4. **Debrief.** Verdict, rubric, the moment to redo, next steps.
5. **Follow-ups.** The member asks questions about the debrief.

## Data model
`interviews`: one row per interview.

| Column | Why |
|---|---|
| `kind`, `bar`, `difficulty`, `target` | The member's choices at start |
| `subject` | What was picked: resume id, problem slug or design-prompt slug. Used so coding and design never repeat a subject |
| `title` | Display name, e.g. "Resume: SWE" or the problem title |
| `briefing` | Resume text frozen at start, so the grader judges against exactly what the interviewer saw. Never returned by the API |
| `minutes` | Allotted time for the kind |
| `status` | `active` → `grading` → `graded`, or `failed` |
| `verdict`, `debrief` | Written by the grader. `verdict` is a column so lists can show it without reading the JSON |
| `started_at`, `ended_at` | The clock, and the daily-limit window |

`interview_turns`: one row per message, `phase` = `interview` or `followup`,
`role` = `user` or `assistant`, plus optional `code`. A question and its answer
are inserted in one transaction, so a thread never keeps a question whose
answer was lost.

Indexes: `(user_id, started_at desc)` for the list and the daily limit;
`(interview_id, created_at)` for loading a transcript.

### Status
```
          End                 grader succeeds
active ─────────→ grading ─────────────────────→ graded
                    │  ↑
     grader fails   │  │ End again (retry)
                    ↓  │
                   failed
```
`MarkGrading` only moves `active` or `failed` rows, so a double-clicked End
grades once.

## API
All routes need a Clerk JWT and an approved member. Each route only sees the
caller's own interviews (`user_id` is part of every query).

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/me/interviews` | | `{available, interviews: Summary[]}`, newest 50 |
| POST | `/me/interviews` | `{kind, bar?, difficulty?, target?}` | `Interview` with the opening turn |
| GET | `/me/interviews/{id}` | | `Interview` (turns, follow-ups, debrief) |
| POST | `/me/interviews/{id}/turns` | `{message, code?}` | `Interview` with the reply appended |
| POST | `/me/interviews/{id}/end` | | `Interview` in `grading` |
| POST | `/me/interviews/{id}/followups` | `{message}` | `Interview` with the answer appended |

`end` is a POST sub-resource because it is a state transition, not an edit.
`available: false` tells the UI to hide the feature when no AI deployment is
configured.

| Status | When |
|---|---|
| 400 | Bad kind/bar/difficulty, empty or oversized message, `resume` kind with no resume |
| 404 | Not found, not the caller's, or not a UUID |
| 409 | Wrong state: replying to an ended interview, follow-up before graded |
| 429 | Daily limit or per-interview turn cap reached |
| 503 | AI not configured |
| 504 | Interviewer took longer than 25s; the member resends |

## Architecture
```
SPA ─→ CloudFront /api ─→ API Gateway ─→ api λ ──→ Postgres
                                          │  └──→ Azure OpenAI "balanced" (interviewer, follow-ups)
                                          └─ End → SQS kronos-grade ─→ grade λ ──→ Azure "deep", effort high
                                                        └─ 3 failures → DLQ        └──→ Postgres
```
- Live turns run inside the API request. Each is capped at 25s so it finishes
  inside API Gateway's 30s limit.
- Grading takes longer, so it runs on its own Lambda from a queue: 240s timeout,
  up to two model attempts, then `failed`.
- The interviewer and the grader are different deployments: a fast one for
  conversation, a stronger one for judgment.
- Prompts live in `internal/interview/prompts.go`. The interviewer prompt gets
  the bar, the briefing and a clock line on every turn, so it can pace and wrap up.

## Limits and security
| Limit | Value | Why |
|---|---|---|
| Interviews started per 24h | 6 | Azure cost |
| Turns per interview | 80 | Cost, and a runaway-loop guard |
| Follow-ups per interview | 30 | Cost |
| Message / code / target size | 8 KB / 20 KB / 200 B | Prompt size and cost |
| Resume in briefing | 20 KB | Prompt size |
| Reply tokens: turn / follow-up / debrief | 2.5k / 3k / 16k | Cost and latency |

- The briefing (resume text) is never serialized (`json:"-"`).
- Member text goes into prompts. The prompts treat it as the candidate's
  answer, but prompt injection can still change the interviewer's behavior. The
  worst outcome is a misleading debrief for that member's own interview; no other
  member's data is in the prompt.

## Failure modes
| What fails | What happens |
|---|---|
| Azure slow on a turn | 504 after 25s; nothing saved; the member resends |
| Azure fails the opening | The new interview is deleted, so it doesn't count toward the limit |
| Grader returns bad JSON | Retried once in-process, then `failed`; End retries |
| Grade Lambda crashes or times out | SQS redelivers (up to 3 times) |
| All 3 deliveries fail | Message goes to the DLQ (alarm) and the interview **stays `grading`**, see Open questions |
| SQS send fails on End | The interview is marked `failed`; End retries |

## Rollout
1. Schema: the two tables are `create table if not exists`, applied by the deploy.
2. Infra (in this PR): the grade queue, DLQ and grade Lambda.
3. Secrets: `/kronos/AZURE_OPENAI_KEY` in SSM before the first apply.
4. Frontend behind `available`: the UI shows nothing until the backend reports it is configured.
5. Rollback: unset the Azure variables and the API answers 503 and the UI hides
   the feature. The tables can stay.

## Open questions
1. **Stuck in `grading`.** If every delivery fails before the grader can mark
   the interview `failed`, it stays `grading` forever and End can't retry it.
   *Recommendation:* let `MarkGrading` also take `grading` rows whose
   `ended_at` is more than 15 minutes old.
2. **The clock isn't enforced.** The interviewer is told the time but the
   server accepts turns past the limit. *Recommendation:* accept turns up to
   `minutes + 10`, then 409 and prompt the member to end.
3. **Two replies at once.** Two simultaneous `turns` requests both pass the
   `active` check. The UI should disable send while waiting, which is enough for now.
   *Recommendation:* leave it; revisit if it shows up.
4. **Deleting interviews.** There is no member-facing delete. *Recommendation:*
   add `DELETE /me/interviews/{id}` before launch, since interviews hold resume text.
5. **Voice.** *Recommendation:* the browser connects straight to Azure Realtime
   with a short-lived token minted by the API; no audio passes through AWS.
6. **Streaming replies** would remove the 25s cap and make turns feel live.
   Needs a Lambda Function URL with response streaming; do it with voice.

## Decision log
- 2026-10-05: AI scope is mock interviews only, no gamification; job board deferred.
- 2026-10-05: Resume interviews are first-class, because real loops open from the resume.
- 2026-10-05: Grading moved from a direct async Lambda invoke to SQS with a DLQ, so failures are retried and visible.
- 2026-10-05: Coach chat capped at 40 questions per day, matching the interview cap.
