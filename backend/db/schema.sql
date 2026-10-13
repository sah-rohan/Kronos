create extension if not exists citext;
create extension if not exists pgcrypto;

create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  clerk_id        text unique,                 -- Clerk identity (OAuth login)
  leetcode_user   citext unique,               -- unique LeetCode username (no impersonation)
  github_user     text,
  display_name    text not null,
  status          text not null default 'approved',  -- everyone is a member; 'pending' is legacy
  role            text not null default 'member',   -- 'member' | 'admin'
  email           text,                             -- Google account email (for admin reference)
  active          boolean not null default true,    -- false = soft-deleted (kept for history)
  created_at      timestamptz not null default now()
);

alter table users add column if not exists active boolean not null default true;
-- Pending LeetCode-username change requested by the user; admin reviews & applies.
alter table users add column if not exists requested_username text;
alter table users add column if not exists email text;
-- Membership is now automatic: approve everyone (LeetCode is gated on a linked username, not approval).
update users set status = 'approved' where status = 'pending';

-- Small key/value store for app-level settings (non-secret). e.g. the LeetCode
-- session token's expiry timestamp (the token itself lives in SSM SecureString).
create table if not exists app_settings (
  key   text primary key,
  value text not null
);

create table if not exists groups (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,               -- e.g. "Summer 2026"
  season_start    timestamptz not null,        -- only solves on/after this count
  season_end      timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists group_members (
  group_id        uuid not null references groups(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role            text not null default 'member',  -- 'admin' | 'member'
  joined_at       timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists friendships (
  user_id         uuid not null references users(id) on delete cascade,
  friend_id       uuid not null references users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- The NeetCode 150 catalog (seeded once). slug must match LeetCode titleSlug.
create table if not exists problems (
  id              integer primary key,         -- LeetCode frontend question id
  slug            text unique not null,        -- titleSlug, e.g. "two-sum"
  title           text not null,
  difficulty      text not null check (difficulty in ('Easy','Medium','Hard')),
  category        text not null,               -- "Arrays & Hashing", etc.
  blind75         boolean not null default false,
  neetcode150     boolean not null default false,
  neetcode250     boolean not null default false
);

alter table problems add column if not exists blind75 boolean not null default false;
alter table problems add column if not exists neetcode150 boolean not null default false;
alter table problems add column if not exists neetcode250 boolean not null default false;

-- One row per (user, problem) once it counts for the season.
alter table users add column if not exists theme text not null default 'light';
update users set theme = 'auto' where theme is null or theme = ''; 

create table if not exists solves (
  user_id            uuid not null references users(id) on delete cascade,
  problem_id         integer not null references problems(id),
  first_season_ac_at timestamptz not null,     -- earliest accepted submission >= season_start
  season_ac_count    integer not null default 1,
  submission_id      bigint,                   -- latest season AC submission id
  -- enriched from submissionDetails via one shared authenticated session:
  lang               text,
  code               text,                     -- full source (for the "view solution" feature)
  runtime_ms         integer,
  memory_kb          integer,
  runtime_pct        real,
  memory_pct         real,
  is_optimal         boolean not null default false,
  optimal_checked    boolean not null default false,  -- has the enricher scored submission_id yet
  primary key (user_id, problem_id)
);

-- Pending friend requests. On accept, two friendship rows are created (both
-- directions) so each side sees the other.
create table if not exists friend_requests (
  requester_id uuid not null references users(id) on delete cascade,
  target_id    uuid not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (requester_id, target_id)
);

-- Every captured accepted submission, queued for the enricher. One row per
-- LeetCode submission id so distinct languages are never lost.
create table if not exists submissions (
  submission_id bigint primary key,
  user_id       uuid not null references users(id) on delete cascade,
  problem_id    integer not null references problems(id),
  solved_at     timestamptz not null,
  enriched      boolean not null default false
);

-- One row per enriched submission, so a user's solution history is preserved.
-- The UI slides through them most-recent-first (deduped by identical code).
create table if not exists solutions (
  user_id       uuid not null references users(id) on delete cascade,
  problem_id    integer not null references problems(id),
  submission_id bigint not null,
  lang          text not null,
  code          text not null,
  runtime_ms    integer not null default 0,
  memory_kb     integer not null default 0,
  runtime_pct   real not null default 0,
  is_optimal    boolean not null default false,
  solved_at     timestamptz not null,
  primary key (user_id, problem_id, submission_id)
);

-- Per-user polling state for the accepted-submission-count delta guard.
create table if not exists sync_state (
  user_id            uuid primary key references users(id) on delete cascade,
  last_ac_count      integer not null default 0,    -- acSubmissionNum.All.submissions last seen
  last_seen_ac_ts    bigint  not null default 0,    -- max accepted-submission epoch processed
  last_polled_at     timestamptz,
  next_poll_at       timestamptz not null default now(),  -- adaptive cadence cursor
  consecutive_idle   integer not null default 0
);

-- Raised when D > 20 (burst overflowed the public 20-window). The user is
-- asked to confirm which problems they solved; unverifiable from public data.
create table if not exists pending_confirmations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  detected_at     timestamptz not null default now(),
  missing_count   integer not null,            -- D - 20
  resolved        boolean not null default false
);

-- One row per app open, for the admin "views" metric. user_id is nulled (not
-- deleted) if the user is purged, so the historical count is preserved.
create table if not exists visits (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references users(id) on delete set null,
  at       timestamptz not null default now()
);
create index if not exists idx_visits_at on visits(at);

-- One row per system-design module a user has completed, for ranking.
create table if not exists sd_solves (
  user_id   uuid not null references users(id) on delete cascade,
  slug      text not null,
  solved_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create index if not exists idx_solves_user on solves(user_id);
create index if not exists idx_submissions_pending on submissions(enriched) where not enriched;
create index if not exists idx_solutions_user_problem on solutions(user_id, problem_id);
create index if not exists idx_members_user on group_members(user_id);
create index if not exists idx_sync_next_poll on sync_state(next_poll_at) where true;

-- What a member actually built on a System Design canvas. Referenced by the
-- design repo; doubles as context for AI critique.
create table if not exists sd_attempts (
  user_id    uuid not null references users(id) on delete cascade,
  slug       text not null,
  design     jsonb not null,
  ok         boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, slug)
);

-- Career context for the coach: the resumes a member keeps on file and the
-- roles they are applying to. Both are plain text, because the model reads
-- them and nothing else does.
create table if not exists resumes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  label      text not null,
  content    text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_resumes_user on resumes(user_id, updated_at desc);
-- At most one primary resume per member; the coach reads that one by default.
create unique index if not exists idx_resumes_primary on resumes(user_id) where is_primary;

create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  company     text not null,
  title       text not null,
  location    text not null default '',
  url         text not null default '',
  description text not null default '',
  status      text not null default 'saved'
              check (status in ('saved','applied','interviewing','offer','rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_jobs_user on jobs(user_id, updated_at desc);

-- One row per turn of a coach conversation. A thread is (user, job): the role
-- the advice is about, or null for general prep.
create table if not exists coach_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  job_id     uuid references jobs(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_coach_thread on coach_messages(user_id, job_id, created_at);

-- A mock interview. briefing is frozen at start (resume text, problem, prompt)
-- so the grader judges against exactly what the interviewer was given.
create table if not exists interviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null check (kind in ('resume','coding','behavioral','design')),
  bar         text not null default 'top' check (bar in ('top','standard')),
  difficulty  text not null default 'Medium' check (difficulty in ('Easy','Medium','Hard')),
  target      text not null default '',
  subject     text not null default '',
  title       text not null default '',
  briefing    text not null default '',
  minutes     integer not null,
  status      text not null default 'active'
              check (status in ('active','grading','graded','failed')),
  verdict     text,
  debrief     jsonb,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
create index if not exists idx_interviews_user on interviews(user_id, started_at desc);

create table if not exists interview_turns (
  id           uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  phase        text not null default 'interview' check (phase in ('interview','followup')),
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  code         text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists idx_interview_turns on interview_turns(interview_id, created_at);

-- The coding room: the problem as the interviewer stated it, the candidate's
-- code (reasoning written as comments), and the live read of the six rubric areas.
alter table interviews add column if not exists language text not null default '';
alter table interviews add column if not exists problem jsonb;
alter table interviews add column if not exists code text not null default '';
alter table interviews add column if not exists code_version integer not null default 1;
alter table interviews add column if not exists signals jsonb;
alter table interviews add column if not exists observed_at timestamptz;
alter table interviews add column if not exists observations integer not null default 0;
alter table interview_turns add column if not exists signals jsonb;
alter table interview_turns add column if not exists unprompted boolean not null default false;
