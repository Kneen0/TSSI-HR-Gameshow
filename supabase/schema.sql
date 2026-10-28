-- =====================================================================
-- OPTIONAL: keeps a history of final leaderboards for each monthly event.
-- The live game itself only needs Supabase Realtime (no tables).
-- Run this once in Supabase → SQL Editor → New query → Run.
-- =====================================================================

create table if not exists public.game_results (
  id          bigint generated always as identity primary key,
  played_at   timestamptz not null default now(),
  room        text not null,
  player_name text not null,
  country     text,
  score       integer not null default 0,
  rank        integer,
  breakdown   jsonb
);

alter table public.game_results enable row level security;

-- The host screen (using the public anon key) may add results…
grant insert on public.game_results to anon;
drop policy if exists "host can insert results" on public.game_results;
create policy "host can insert results"
  on public.game_results for insert
  to anon
  with check (true);

-- …but nobody can read, change or delete them through the public key.
-- View the results in the Supabase dashboard (Table Editor), or run:
--   select played_at::date, rank, player_name, country, score
--   from game_results order by played_at desc, rank;

-- Handy "Hall of Fame" across all months:
create or replace view public.hall_of_fame as
  select player_name, country, count(*) as games_played, sum(score) as total_points,
         count(*) filter (where rank = 1) as wins
  from public.game_results
  group by player_name, country
  order by total_points desc;
revoke all on public.hall_of_fame from anon, authenticated;
