-- Fresh-season reset: wipes all progress so every member starts at zero.
-- Keeps user accounts, problems, friendships, and groups intact.
-- Pair this with setting SEASON_START to the release timestamp so only
-- submissions made after that moment are counted.

begin;

truncate table
  solutions,
  submissions,
  solves,
  sync_state,
  pending_confirmations
restart identity;

commit;
