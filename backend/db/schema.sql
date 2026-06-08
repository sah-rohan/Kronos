create extension if not exists citext;
create extension if not exists pgcrypto;

create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  clerk_id        text unique,                 -- Clerk identity (OAuth login)
  leetcode_user   citext unique,               -- unique LeetCode username (no impersonation)
  github_user     text,
  display_name    text not null,
  status          text not null default 'pending',  -- 'pending' | 'approved'
  role            text not null default 'member',   -- 'member' | 'admin'
  created_at      timestamptz not null default now()
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

create index if not exists idx_solves_user on solves(user_id);
create index if not exists idx_submissions_pending on submissions(enriched) where not enriched;
create index if not exists idx_solutions_user_problem on solutions(user_id, problem_id);
create index if not exists idx_members_user on group_members(user_id);
create index if not exists idx_sync_next_poll on sync_state(next_poll_at) where true;
