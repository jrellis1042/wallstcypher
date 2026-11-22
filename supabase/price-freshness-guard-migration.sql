-- Price-freshness guard migration — Wall St. Cypher (Nov 21, 2026).
--
-- WHAT: _cypher_feed_state() now returns 'feed_unreachable' when the
-- cached quotes asOf is older than the most recent weekday 16:00 ET
-- market close — checked BEFORE the market-open check, so it applies
-- on weekends and after hours too.
--
-- WHY: before this, weekends returned 'market_closed' without ever
-- checking cache age, so days-old prices posed as "the last close".
-- On Nov 21, 2026 the live cache held fake round-number values
-- (AAPL $250, META $600, ...) while the site showed them as real
-- Yahoo Finance last closes. The fake row was deleted and real prices
-- pushed in by hand; this guard makes a stale cache unable to
-- masquerade as the last close again. Market-hours behavior is
-- unchanged: live (asOf <= 15 min), delayed (15-30 min), and a fresh
-- last close outside hours still reports 'market_closed'.
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor
-- (project mkyrzikeqpqncgemlsds) and run once — the same route as the
-- Nov 21 email-recovery migration. Idempotent (CREATE OR REPLACE):
-- safe to run twice. No tables are created, altered, or touched; no
-- rows are changed. After running, verify with:
--   select public._cypher_feed_state();
-- (expect 'market_closed' with the current fresh cache outside hours,
-- 'live'/'delayed' in market hours) and check the Trade Floor renders
-- the real last close.
--
-- NOTE: the same function text lives in supabase/schema.sql (the
-- source of truth for full deploys). Keep the two in sync.

-- Honest feed state for the real quotes cache, from the NY clock and the
-- age of the cached asOf. (The Action refreshes every 10 min in market
-- hours, so a fresh cache in market hours is 'live'.)
-- Nov 21, 2026 fix: a cache older than the most recent weekday 16:00 ET
-- market close is 'feed_unreachable' even outside market hours. Before
-- this, weekends returned 'market_closed' without ever checking cache
-- age, so days-old prices posed as "the last close" (the cache once held
-- fake round-number values for days while the site showed them as real).
create or replace function public._cypher_feed_state()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_asof   timestamptz;
  v_ny     timestamptz;
  v_dow    int;
  v_t      time;
  v_open   boolean;
  v_age_min numeric;
  v_close_day date;
  v_last_close timestamptz;
begin
  select nullif(payload ->> 'asOf', '')::timestamptz into v_asof
    from public.cypher_quotes_cache where id = 1;
  if v_asof is null then return 'feed_unreachable'; end if;
  v_ny  := now() at time zone 'America/New_York';
  v_dow := extract(isodow from v_ny);
  v_t   := v_ny::time;
  -- Most recent weekday 16:00 ET market close, as a true instant.
  -- Today counts only once its close has passed; weekends step back
  -- to Friday. A cache older than this is stale beyond the last close.
  v_close_day := v_ny::date;
  if v_t < time '16:00' then v_close_day := v_close_day - 1; end if;
  while extract(isodow from v_close_day) in (6, 7) loop
    v_close_day := v_close_day - 1;
  end loop;
  v_last_close := (v_close_day::timestamp + time '16:00') at time zone 'America/New_York';
  if v_asof < v_last_close then return 'feed_unreachable'; end if;
  v_open := v_dow between 1 and 5 and v_t >= time '09:30' and v_t < time '16:00';
  if not v_open then return 'market_closed'; end if;
  v_age_min := extract(epoch from (now() - v_asof)) / 60.0;
  if v_age_min <= 15 then return 'live'; end if;
  if v_age_min <= 30 then return 'delayed'; end if;
  return 'feed_unreachable';
end;
$$;
