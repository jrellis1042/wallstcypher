-- ============================================================================
-- WALL ST. CYPHER — standalone backend schema (Supabase / Postgres)
-- ============================================================================
-- HOW TO APPLY
--   Paste this WHOLE file once into the Supabase Dashboard -> SQL Editor
--   for project mkyrzikeqpqncgemlsds and press Run. It is safe to re-run:
--   tables use IF NOT EXISTS, functions use CREATE OR REPLACE.
--   (A re-run does NOT alter existing tables; drop a cypher_* table first
--   only if you intentionally want to reset it.)
--
-- SECURITY MODEL
--   * Every cypher_* table has Row Level Security ENABLED with NO policies
--     (deny-all). The anon / authenticated roles can NEVER read or write
--     these tables directly through PostgREST.
--   * ALL access goes through the SECURITY DEFINER RPCs below, which run
--     as the table owner and enforce auth + every game rule server-side.
--   * The frontend uses ONLY the anon key (apikey + Authorization Bearer
--     <anon key>). The service key is NEVER used here and must NEVER be
--     embedded in the repo or the frontend.
--   * PINs / owner access codes are stored ONLY as bcrypt hashes
--     (crypt() / gen_salt('bf') via pgcrypto). Plain PINs never hit a table.
--
-- MONEY
--   Practice funds ONLY. No broker, no bank, no real money anywhere.
--   All amounts are USD practice dollars, numeric(14,2).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

create table if not exists public.cypher_profiles (
  id           uuid primary key default gen_random_uuid(),
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  tier         text not null default 'Rookie'
               check (tier in ('Little Legends', 'Rookie', 'Rookie · Kid Mode',
                               'Teen Trader', 'Adult Trader')),
  pin_hash     text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.cypher_sessions (
  token      text primary key default encode(gen_random_bytes(32), 'hex'),
  profile_id uuid not null references public.cypher_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (expires_at > created_at)
);

create table if not exists public.cypher_progress (
  profile_id uuid primary key references public.cypher_profiles (id) on delete cascade,
  level      int  not null default 0 check (level between 0 and 200),
  xp         int  not null default 0 check (xp >= 0),
  stars      int  not null default 0 check (stars >= 0),
  -- skills: {"market_order":true, "limit_fill":true, "stop_loss":true,
  --          "take_profit":true, "diversified":true, "profitable_close":true}
  skills     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.cypher_holdings (
  profile_id uuid    not null references public.cypher_profiles (id) on delete cascade,
  ticker     text    not null,
  shares     numeric(18,4) not null check (shares > 0),
  avg_cost   numeric(14,2) not null check (avg_cost >= 0),
  primary key (profile_id, ticker)
);

create table if not exists public.cypher_wallet_ledger (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.cypher_profiles (id) on delete cascade,
  kind          text not null check (kind in ('deposit', 'withdraw', 'buy', 'sell')),
  amount        numeric(14,2) not null, -- signed: deposits/sells +, withdraws/buys -
  balance_after numeric(14,2) not null,
  note          text,
  created_at    timestamptz not null default now()
);

create table if not exists public.cypher_orders (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.cypher_profiles (id) on delete cascade,
  desk         text not null default 'live' check (desk in ('live', 'trade_floor')),
  ticker       text not null,
  side         text not null check (side in ('buy', 'sell')),
  order_type   text not null check (order_type in ('market', 'limit', 'stop', 'take_profit')),
  qty          numeric(14,4) not null check (qty > 0),
  limit_price  numeric(14,2),  -- limit trigger (limit orders) / take-profit trigger
  stop_price   numeric(14,2),  -- stop trigger (stop orders) / stop-loss carried on any order
  status       text not null default 'open'
               check (status in ('open', 'filled', 'cancelled', 'expired')),
  filled_price numeric(14,2),
  created_at   timestamptz not null default now(),
  filled_at    timestamptz,
  check (order_type <> 'limit'       or limit_price is not null),
  check (order_type <> 'stop'        or stop_price is not null),
  check (order_type <> 'take_profit' or limit_price is not null)
);

create table if not exists public.cypher_events (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references public.cypher_profiles (id) on delete cascade,
  kind       text not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cypher_owners (
  id               uuid primary key default gen_random_uuid(),
  owner_id         text not null unique check (owner_id ~ '^[a-z0-9_]{3,30}$'),
  name             text not null,
  access_code_hash text not null,
  created_at       timestamptz not null default now()
);

create table if not exists public.cypher_owner_sessions (
  token      text primary key default encode(gen_random_bytes(32), 'hex'),
  owner_id   uuid not null references public.cypher_owners (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  check (expires_at > created_at)
);

-- Single-row cache of the latest real quotes, written by the frontend from
-- data/quotes.json (via cypher_cache_quotes) after the GitHub Action
-- refreshes that file from Yahoo Finance.
create table if not exists public.cypher_quotes_cache (
  id         int primary key check (id = 1),
  payload    jsonb not null,
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

create index if not exists idx_cypher_sessions_profile
  on public.cypher_sessions (profile_id);
create index if not exists idx_cypher_ledger_profile_created
  on public.cypher_wallet_ledger (profile_id, created_at desc);
create index if not exists idx_cypher_orders_profile_status
  on public.cypher_orders (profile_id, status, created_at);
create index if not exists idx_cypher_orders_open
  on public.cypher_orders (status, created_at) where status = 'open';
create index if not exists idx_cypher_events_profile_created
  on public.cypher_events (profile_id, created_at desc);
create index if not exists idx_cypher_events_kind_created
  on public.cypher_events (kind, created_at desc);
create index if not exists idx_cypher_holdings_profile
  on public.cypher_holdings (profile_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — deny-all on every cypher_* table.
-- No policies are created on purpose: only SECURITY DEFINER functions
-- (which bypass RLS) may touch these tables.
-- ---------------------------------------------------------------------------

alter table public.cypher_profiles        enable row level security;
alter table public.cypher_sessions       enable row level security;
alter table public.cypher_progress       enable row level security;
alter table public.cypher_holdings       enable row level security;
alter table public.cypher_wallet_ledger  enable row level security;
alter table public.cypher_orders         enable row level security;
alter table public.cypher_events         enable row level security;
alter table public.cypher_owners         enable row level security;
alter table public.cypher_owner_sessions enable row level security;
alter table public.cypher_quotes_cache   enable row level security;

-- Belt-and-braces: the anon/authenticated roles get no direct table rights
-- on cypher_* tables even if a future policy is added by mistake.
revoke all on public.cypher_profiles        from anon, authenticated;
revoke all on public.cypher_sessions       from anon, authenticated;
revoke all on public.cypher_progress       from anon, authenticated;
revoke all on public.cypher_holdings       from anon, authenticated;
revoke all on public.cypher_wallet_ledger  from anon, authenticated;
revoke all on public.cypher_orders         from anon, authenticated;
revoke all on public.cypher_events         from anon, authenticated;
revoke all on public.cypher_owners         from anon, authenticated;
revoke all on public.cypher_owner_sessions from anon, authenticated;
revoke all on public.cypher_quotes_cache   from anon, authenticated;

-- ============================================================================
-- INTERNAL HELPERS (no EXECUTE grant — only the RPCs below call these)
-- ============================================================================

-- Live (real) tickers. Trade Floor (simulated) tickers are the 16 themed
-- companies from the game (BOOM ... TURNTBL). The two sets never overlap.
create or replace function public._cypher_is_live(p_ticker text)
returns boolean language sql immutable set search_path = public as $$
  select p_ticker = any (array['AAPL','MSFT','NVDA','AMZN','TSLA','META','GOOGL','AMD']);
$$;

create or replace function public._cypher_is_themed(p_ticker text)
returns boolean language sql immutable set search_path = public as $$
  select p_ticker = any (array['BOOM','BEAT','GOLD','VINYL','FLOW','MIC','HUSTLE',
                               'EMPIRE','LEGACY','CYPHER','BASS','TEMPO','CROWN',
                               'STUDIO','BLOCK','TURNTBL']);
$$;

-- Gateway index from highest completed level. Gateways sit at
-- 25/50/75/100/125/150/175/200. G0 = below level 25, G8 = level 200.
create or replace function public._cypher_gateway(p_level int)
returns int language sql immutable set search_path = public as $$
  select case when p_level >= 200 then 8
              when p_level >= 175 then 7
              when p_level >= 150 then 6
              when p_level >= 125 then 5
              when p_level >= 100 then 4
              when p_level >= 75  then 3
              when p_level >= 50  then 2
              when p_level >= 25  then 1
              else 0 end;
$$;

-- Next gateway level a player is working toward (null at G8).
create or replace function public._cypher_next_gateway_level(p_level int)
returns int language sql immutable set search_path = public as $$
  select case when p_level >= 200 then null
              when p_level >= 175 then 200
              when p_level >= 150 then 175
              when p_level >= 125 then 150
              when p_level >= 100 then 125
              when p_level >= 75  then 100
              when p_level >= 50  then 75
              when p_level >= 25  then 50
              else 25 end;
$$;

-- Cumulative lifetime PRACTICE-deposit cap for the player's gateway.
-- NULL = uncapped (G8, level 200). Withdrawals do NOT restore headroom:
-- cycling money in and out cannot raise the cap.
create or replace function public._cypher_deposit_cap(p_level int)
returns numeric language sql immutable set search_path = public as $$
  select case public._cypher_gateway(p_level)
              when 0 then 250::numeric
              when 1 then 500::numeric
              when 2 then 1000::numeric
              when 3 then 2500::numeric
              when 4 then 5000::numeric
              when 5 then 10000::numeric
              when 6 then 25000::numeric
              when 7 then 50000::numeric
              else null end;
$$;

-- Max shares in ONE Live Desk buy order, by gateway. G0 = 0 (desk locked).
-- Trade Floor is always max 10 shares per trade (see papertrade).
create or replace function public._cypher_max_buy(p_level int)
returns int language sql immutable set search_path = public as $$
  select case public._cypher_gateway(p_level)
              when 0 then 0 when 1 then 10 when 2 then 15 when 3 then 20
              when 4 then 30 when 5 then 50 when 6 then 75 when 7 then 100
              else 200 end;
$$;

-- Validate a player session token; returns the profile id or raises.
create or replace function public._cypher_auth(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid;
begin
  if p_token is null or p_token = '' then
    raise exception 'missing session token';
  end if;
  select profile_id into v_profile_id
    from public.cypher_sessions
   where token = p_token and expires_at > now();
  if v_profile_id is null then
    raise exception 'invalid or expired session — please sign in again';
  end if;
  return v_profile_id;
end;
$$;

-- Validate an owner session token; returns the owner id (uuid) or raises.
create or replace function public._cypher_owner_auth(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
begin
  if p_token is null or p_token = '' then
    raise exception 'missing owner token';
  end if;
  select owner_id into v_owner_id
    from public.cypher_owner_sessions
   where token = p_token and expires_at > now();
  if v_owner_id is null then
    raise exception 'invalid or expired owner session';
  end if;
  return v_owner_id;
end;
$$;

-- Cash balance = sum of the wallet ledger (practice dollars).
create or replace function public._cypher_balance(p_profile_id uuid)
returns numeric language sql security definer set search_path = public as $$
  select coalesce(sum(amount), 0::numeric)
    from public.cypher_wallet_ledger where profile_id = p_profile_id;
$$;

-- Cumulative gross practice deposits (for the deposit cap).
create or replace function public._cypher_total_deposited(p_profile_id uuid)
returns numeric language sql security definer set search_path = public as $$
  select coalesce(sum(amount), 0::numeric)
    from public.cypher_wallet_ledger
   where profile_id = p_profile_id and kind = 'deposit';
$$;

-- Latest cached REAL price for a live ticker, null when the cache is empty
-- or the ticker is not in it. Never raises: callers treat null as
-- "feed unavailable".
create or replace function public._cypher_live_price(p_ticker text)
returns numeric language sql security definer set search_path = public as $$
  select nullif(payload -> 'tickers' -> p_ticker ->> 'price', '')::numeric
    from public.cypher_quotes_cache where id = 1;
$$;

-- --- Simulated Trade Floor feed (RPC-computed deterministic seeded walk) ---
-- Base price per themed ticker (practice dollars). The walk starts at
-- 2026-01-01, moves at most +/-3% a day from a hash of (ticker || date),
-- and is pulled 2% a day back toward its base price so it stays bounded.
-- Same ticker + same date => same price, on this database, every time.
-- (hashtext() is stable within one Postgres deployment; the frontend never
-- computes prices itself — it always asks getprices(), so no cross-system
-- determinism is needed.)
create or replace function public._cypher_sim_base(p_ticker text)
returns numeric language sql immutable set search_path = public as $$
  select case p_ticker
    when 'BOOM'   then 42.00 when 'BEAT'   then 88.50
    when 'GOLD'   then 156.25 when 'VINYL' then 23.75
    when 'FLOW'   then 64.10 when 'MIC'    then 112.40
    when 'HUSTLE' then 78.90 when 'EMPIRE' then 210.00
    when 'LEGACY' then 95.30 when 'CYPHER' then 134.60
    when 'BASS'   then 51.20 when 'TEMPO'  then 67.80
    when 'CROWN'  then 38.45 when 'STUDIO' then 145.75
    when 'BLOCK'  then 29.60 when 'TURNTBL' then 58.25
    else null end;
$$;

create or replace function public._cypher_sim_price(p_ticker text, p_date date)
returns numeric language plpgsql immutable set search_path = public as $$
declare
  v_base  numeric := public._cypher_sim_base(p_ticker);
  v_price numeric;
  v_d     date := date '2026-01-01';
  v_n     int;
  v_r     numeric;
begin
  if v_base is null then return null; end if;
  if p_date < v_d then p_date := v_d; end if;
  v_price := v_base;
  while v_d <= p_date loop
    -- 0..600 without abs() (avoids the INT_MIN edge), so -3.00%..+3.00%.
    v_n := ((hashtext(p_ticker || v_d::text) % 601) + 601) % 601;
    v_r := (v_n - 300) / 10000.0;
    v_price := v_price * (1 + v_r);
    v_price := v_price + (v_base - v_price) * 0.02; -- mean reversion
    v_d := v_d + 1;
  end loop;
  return round(v_price, 2);
end;
$$;

-- Current value of one holding: live tickers at the cached real price
-- (falling back to avg_cost when the feed is down), themed tickers at the
-- simulated price for today.
create or replace function public._cypher_holding_price(p_ticker text, p_avg_cost numeric)
returns numeric language sql security definer set search_path = public as $$
  select case when public._cypher_is_live(p_ticker)
              then coalesce(public._cypher_live_price(p_ticker), p_avg_cost)
              when public._cypher_is_themed(p_ticker)
              then public._cypher_sim_price(p_ticker, current_date)
              else p_avg_cost end;
$$;

-- Account value = cash + market value of all holdings.
create or replace function public._cypher_account_value(p_profile_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_total numeric;
  r record;
begin
  v_total := public._cypher_balance(p_profile_id);
  for r in select ticker, shares, avg_cost
             from public.cypher_holdings where profile_id = p_profile_id
  loop
    v_total := v_total
      + r.shares * coalesce(public._cypher_holding_price(r.ticker, r.avg_cost), r.avg_cost);
  end loop;
  return round(coalesce(v_total, 0), 2);
end;
$$;

-- 2%-OF-ACCOUNT RISK CAP (one rule, enforced at order/trade placement).
--   With a stop:  risk = qty x |entry price - stop price|
--   No stop:      risk = qty x entry price x 0.02   (a 2% adverse move)
--   Rule:         risk <= 2% of account value, or the trade is rejected.
-- For a no-stop order this simplifies to "position size <= account value",
-- which is exactly the point: without a stop you may not bet the house.
create or replace function public._cypher_check_risk(
  p_profile_id uuid, p_entry numeric, p_qty numeric, p_stop numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_account numeric;
  v_risk    numeric;
  v_cap     numeric;
begin
  v_account := public._cypher_account_value(p_profile_id);
  if v_account is null or v_account <= 0 then
    raise exception 'account value must be above $0 to trade — add practice funds first';
  end if;
  if p_stop is not null then
    v_risk := p_qty * abs(p_entry - p_stop);
  else
    v_risk := p_qty * p_entry * 0.02;
  end if;
  v_cap := 0.02 * v_account;
  if v_risk > v_cap then
    raise exception 'risk cap: this trade risks $% but your 2%% cap is $% (2%% of your $% account value). Use a smaller size or a tighter stop.',
      round(v_risk, 2), round(v_cap, 2), round(v_account, 2);
  end if;
end;
$$;

-- Mark one skill true (idempotent). Skills live in cypher_progress.skills.
create or replace function public._cypher_mark_skill(p_profile_id uuid, p_key text)
returns void language sql security definer set search_path = public as $$
  update public.cypher_progress
     set skills = jsonb_set(coalesce(skills, '{}'::jsonb), array[p_key], 'true'::jsonb),
         updated_at = now()
   where profile_id = p_profile_id;
$$;

-- Re-check the "hold 3+ different tickers at once" skill after any
-- holdings change.
create or replace function public._cypher_refresh_diversified(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  select count(*) into v_n
    from public.cypher_holdings
   where profile_id = p_profile_id and shares > 0;
  if v_n >= 3 then
    perform public._cypher_mark_skill(p_profile_id, 'diversified');
  end if;
end;
$$;

-- DISCIPLINE SCORE 0–100 (computed live from the player's record).
--   Start at 50.
--   +5 per skill earned (max +30).
--   +10 if at least half of filled buys carried a stop (min 2 filled buys).
--   -10 if at least 3 filled buys and most carried NO stop.
--   -5 if more than 5 orders cancelled.
--   Clamped to 0..100.
create or replace function public._cypher_discipline(p_profile_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_skills      int;
  v_filled_buys int;
  v_with_stop   int;
  v_cancelled   int;
  v_score       int;
begin
  select count(*) into v_skills
    from jsonb_each_text(
      (select skills from public.cypher_progress where profile_id = p_profile_id))
   where value = 'true';
  select count(*) into v_filled_buys from public.cypher_orders
   where profile_id = p_profile_id and side = 'buy' and status = 'filled';
  select count(*) into v_with_stop from public.cypher_orders
   where profile_id = p_profile_id and side = 'buy' and status = 'filled'
     and stop_price is not null;
  select count(*) into v_cancelled from public.cypher_orders
   where profile_id = p_profile_id and status = 'cancelled';

  v_score := 50 + 5 * least(coalesce(v_skills, 0), 6);
  if v_filled_buys >= 2 and v_with_stop * 2 >= v_filled_buys then
    v_score := v_score + 10;
  end if;
  if v_filled_buys >= 3 and v_with_stop * 2 < v_filled_buys then
    v_score := v_score - 10;
  end if;
  if v_cancelled > 5 then
    v_score := v_score - 5;
  end if;
  return greatest(0, least(100, v_score));
end;
$$;

-- TRADER READY = all 200 levels complete AND all six skills earned.
-- Six skills (fixed list): market_order, limit_fill, stop_loss,
-- take_profit, diversified, profitable_close.
create or replace function public._cypher_trader_ready(p_profile_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.cypher_progress
     where profile_id = p_profile_id and level >= 200
       and coalesce((skills ->> 'market_order')::boolean, false)
       and coalesce((skills ->> 'limit_fill')::boolean, false)
       and coalesce((skills ->> 'stop_loss')::boolean, false)
       and coalesce((skills ->> 'take_profit')::boolean, false)
       and coalesce((skills ->> 'diversified')::boolean, false)
       and coalesce((skills ->> 'profitable_close')::boolean, false)
  );
$$;

-- Honest feed state for the real quotes cache, from the NY clock and the
-- age of the cached asOf. (The Action refreshes every 10 min in market
-- hours, so a fresh cache in market hours is 'live'.)
create or replace function public._cypher_feed_state()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_asof   timestamptz;
  v_ny     timestamptz;
  v_dow    int;
  v_t      time;
  v_open   boolean;
  v_age_min numeric;
begin
  select nullif(payload ->> 'asOf', '')::timestamptz into v_asof
    from public.cypher_quotes_cache where id = 1;
  if v_asof is null then return 'feed_unreachable'; end if;
  v_ny  := now() at time zone 'America/New_York';
  v_dow := extract(isodow from v_ny);
  v_t   := v_ny::time;
  v_open := v_dow between 1 and 5 and v_t >= time '09:30' and v_t < time '16:00';
  if not v_open then return 'market_closed'; end if;
  v_age_min := extract(epoch from (now() - v_asof)) / 60.0;
  if v_age_min <= 15 then return 'live'; end if;
  if v_age_min <= 30 then return 'delayed'; end if;
  return 'feed_unreachable';
end;
$$;

-- Execute one immediate trade (shared by papertrade, market placeorder,
-- and lazy fill evaluation). Checks funds/shares, updates holdings and
-- the wallet ledger, marks profit/diversified skills, logs a 'trade' event.
-- Raises on insufficient funds/shares; callers decide what that means
-- (market orders surface the error; lazy fills expire the order).
create or replace function public._cypher_execute_trade(
  p_profile_id uuid, p_ticker text, p_side text, p_qty numeric, p_price numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cash      numeric;
  v_cost      numeric;
  v_new_bal   numeric;
  v_shares    numeric;
  v_avg       numeric;
  v_new_avg   numeric;
  v_desk      text;
  v_simulated boolean;
begin
  if p_side not in ('buy', 'sell') then raise exception 'side must be buy or sell'; end if;
  if p_qty <= 0 then raise exception 'qty must be above 0'; end if;
  if p_price <= 0 then raise exception 'price must be above 0'; end if;

  v_desk      := case when public._cypher_is_themed(p_ticker) then 'trade_floor' else 'live' end;
  v_simulated := (v_desk = 'trade_floor');
  v_cash      := public._cypher_balance(p_profile_id);
  v_cost      := round(p_qty * p_price, 2);

  if p_side = 'buy' then
    if v_cost > v_cash then
      raise exception 'insufficient practice funds: this trade costs $% but your balance is $%',
        v_cost, v_cash;
    end if;
    select shares, avg_cost into v_shares, v_avg
      from public.cypher_holdings
     where profile_id = p_profile_id and ticker = p_ticker;
    if found then
      v_new_avg := round((v_shares * v_avg + v_cost) / (v_shares + p_qty), 2);
      update public.cypher_holdings
         set shares = shares + p_qty, avg_cost = v_new_avg
       where profile_id = p_profile_id and ticker = p_ticker;
    else
      insert into public.cypher_holdings (profile_id, ticker, shares, avg_cost)
      values (p_profile_id, p_ticker, p_qty, p_price);
    end if;
    v_new_bal := v_cash - v_cost;
    insert into public.cypher_wallet_ledger (profile_id, kind, amount, balance_after, note)
    values (p_profile_id, 'buy', -v_cost, v_new_bal, p_side || ' ' || p_qty || ' ' || p_ticker || ' @ $' || p_price);
  else
    select shares, avg_cost into v_shares, v_avg
      from public.cypher_holdings
     where profile_id = p_profile_id and ticker = p_ticker;
    if not found or v_shares < p_qty then
      raise exception 'insufficient shares: you hold % %', coalesce(v_shares, 0), p_ticker;
    end if;
    if p_price > v_avg then
      perform public._cypher_mark_skill(p_profile_id, 'profitable_close');
    end if;
    if v_shares = p_qty then
      delete from public.cypher_holdings
       where profile_id = p_profile_id and ticker = p_ticker;
    else
      update public.cypher_holdings
         set shares = shares - p_qty
       where profile_id = p_profile_id and ticker = p_ticker;
    end if;
    v_new_bal := v_cash + v_cost;
    insert into public.cypher_wallet_ledger (profile_id, kind, amount, balance_after, note)
    values (p_profile_id, 'sell', v_cost, v_new_bal, p_side || ' ' || p_qty || ' ' || p_ticker || ' @ $' || p_price);
  end if;

  perform public._cypher_refresh_diversified(p_profile_id);
  insert into public.cypher_events (profile_id, kind, detail)
  values (p_profile_id, 'trade', jsonb_build_object(
    'desk', v_desk, 'ticker', p_ticker, 'side', p_side,
    'qty', p_qty, 'price', p_price, 'simulated', v_simulated));

  select shares into v_shares from public.cypher_holdings
   where profile_id = p_profile_id and ticker = p_ticker;
  return jsonb_build_object(
    'ticker', p_ticker, 'side', p_side, 'qty', p_qty, 'price', p_price,
    'balance', v_new_bal, 'shares_held', coalesce(v_shares, 0),
    'desk', v_desk, 'simulated', v_simulated);
end;
$$;

-- Lazily fill open Live Desk orders against the latest cached real price.
-- Market orders never sit open (they fill immediately at placement).
--   buy  limit: fill when price <= limit_price
--   sell limit / take_profit: fill when price >= limit_price
--   buy  stop:  fill when price >= stop_price
--   sell stop:  fill when price <= stop_price
-- Filled at the CURRENT cached price. An order that can no longer be
-- afforded / covered at fill time EXPIRES instead of going negative.
-- Pass a profile id to evaluate one player, or null for everybody.
create or replace function public._cypher_evaluate_fills(p_profile_id uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_price numeric;
  v_fill  boolean;
  v_filled int := 0;
begin
  if not exists (select 1 from public.cypher_quotes_cache where id = 1) then
    return 0;
  end if;
  for r in select * from public.cypher_orders
            where status = 'open'
              and (p_profile_id is null or profile_id = p_profile_id)
            order by created_at
  loop
    v_price := public._cypher_live_price(r.ticker);
    if v_price is null then continue; end if;
    v_fill := case r.order_type
      when 'limit' then case when r.side = 'buy' then v_price <= r.limit_price
                             else v_price >= r.limit_price end
      when 'stop'  then case when r.side = 'buy' then v_price >= r.stop_price
                             else v_price <= r.stop_price end
      when 'take_profit' then v_price >= r.limit_price
      else false end;
    if not v_fill then continue; end if;
    begin
      perform public._cypher_execute_trade(r.profile_id, r.ticker, r.side, r.qty, v_price);
      update public.cypher_orders
         set status = 'filled', filled_price = v_price, filled_at = now()
       where id = r.id;
      if r.order_type = 'limit' then
        perform public._cypher_mark_skill(r.profile_id, 'limit_fill');
      end if;
      if r.order_type = 'take_profit' then
        perform public._cypher_mark_skill(r.profile_id, 'take_profit');
      end if;
      insert into public.cypher_events (profile_id, kind, detail)
      values (r.profile_id, 'order_filled', jsonb_build_object(
        'order_id', r.id, 'ticker', r.ticker, 'side', r.side,
        'order_type', r.order_type, 'qty', r.qty, 'filled_price', v_price));
      v_filled := v_filled + 1;
    exception when others then
      update public.cypher_orders set status = 'expired' where id = r.id;
      insert into public.cypher_events (profile_id, kind, detail)
      values (r.profile_id, 'order_expired', jsonb_build_object(
        'order_id', r.id, 'ticker', r.ticker, 'reason', sqlerrm));
    end;
  end loop;
  return v_filled;
end;
$$;

-- ============================================================================
-- PLAYER RPCs (called by the frontend with the anon key)
-- ============================================================================

-- Create a profile. PIN is exactly 4 digits; only its bcrypt hash is stored.
-- Username is lowercased and must be unique. Returns the new profile.
create or replace function public.createprofile(
  p_username text, p_display_name text, p_pin text, p_tier text default 'Rookie')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_username text := lower(trim(p_username));
  v_display  text := trim(p_display_name);
  v_id       uuid;
begin
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'username must be 3-20 letters, numbers or underscores';
  end if;
  if v_display is null or char_length(v_display) < 1 or char_length(v_display) > 40 then
    raise exception 'display name must be 1-40 characters';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;
  if p_tier not in ('Little Legends', 'Rookie', 'Rookie · Kid Mode',
                    'Teen Trader', 'Adult Trader') then
    raise exception 'unknown tier';
  end if;
  begin
    insert into public.cypher_profiles (username, display_name, tier, pin_hash)
    values (v_username, v_display, p_tier, crypt(p_pin, gen_salt('bf')))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'username % is already taken', v_username;
  end;
  insert into public.cypher_progress (profile_id) values (v_id);
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_id, 'profile_created',
          jsonb_build_object('username', v_username, 'tier', p_tier));
  return jsonb_build_object(
    'profile_id', v_id, 'username', v_username,
    'display_name', v_display, 'tier', p_tier, 'level', 0, 'xp', 0);
end;
$$;

-- Sign in with username + 4-digit PIN. Returns a 30-day session token.
-- Wrong username and wrong PIN give the SAME error (no user enumeration).
create or replace function public.loginprofile(p_username text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_token text;
  v_expires timestamptz;
begin
  select * into r from public.cypher_profiles
   where username = lower(trim(p_username));
  if r.id is null or r.pin_hash <> crypt(p_pin, r.pin_hash) then
    raise exception 'invalid username or PIN';
  end if;
  delete from public.cypher_sessions
   where profile_id = r.id and expires_at <= now();
  insert into public.cypher_sessions (profile_id)
  values (r.id) returning token, expires_at into v_token, v_expires;
  return jsonb_build_object(
    'token', v_token, 'profile_id', r.id, 'username', r.username,
    'display_name', r.display_name, 'tier', r.tier, 'expires_at', v_expires);
end;
$$;

-- Everything the frontend needs after sign-in (or on reload): profile,
-- progress, wallet, holdings, recent transactions. Never returns hashes.
create or replace function public.getsession(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
  r  record;
  pg record;
begin
  select * into r  from public.cypher_profiles where id = v_profile_id;
  select * into pg from public.cypher_progress where profile_id = v_profile_id;
  return jsonb_build_object(
    'profile', jsonb_build_object(
      'profile_id', r.id, 'username', r.username,
      'display_name', r.display_name, 'tier', r.tier,
      'created_at', r.created_at),
    'progress', jsonb_build_object(
      'level', pg.level, 'xp', pg.xp, 'stars', pg.stars,
      'skills', coalesce(pg.skills, '{}'::jsonb),
      'discipline_score', public._cypher_discipline(v_profile_id),
      'trader_ready', public._cypher_trader_ready(v_profile_id),
      'gateway', public._cypher_gateway(pg.level),
      'next_gateway_level', public._cypher_next_gateway_level(pg.level),
      'deposit_cap', public._cypher_deposit_cap(pg.level),
      'max_buy_shares', public._cypher_max_buy(pg.level)),
    'wallet', jsonb_build_object(
      'balance', public._cypher_balance(v_profile_id),
      'account_value', public._cypher_account_value(v_profile_id),
      'total_deposited', public._cypher_total_deposited(v_profile_id)),
    'holdings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'ticker', h.ticker, 'shares', h.shares, 'avg_cost', h.avg_cost,
               'current_price', public._cypher_holding_price(h.ticker, h.avg_cost),
               'simulated', public._cypher_is_themed(h.ticker))
             order by h.ticker)
        from public.cypher_holdings h where h.profile_id = v_profile_id),
      '[]'::jsonb),
    'transactions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'kind', l.kind, 'amount', l.amount,
               'balance_after', l.balance_after, 'note', l.note,
               'created_at', l.created_at) order by l.created_at desc)
        from (select * from public.cypher_wallet_ledger
               where profile_id = v_profile_id
               order by created_at desc limit 20) l),
      '[]'::jsonb));
end;
$$;

-- Complete one level. Sequential unlock is enforced server-side: the level
-- must be exactly the next one, 1..200. XP is awarded ONCE per level —
-- replaying a level is a no-op error, never double XP.
-- XP: +10 per level, +50 bonus on gateway levels (25/50/.../200).
-- Stars: +1 per level.
create or replace function public.completelevel(p_token text, p_level int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
  v_current    int;
  v_xp_gain    int;
  v_xp         int;
  v_stars      int;
begin
  if p_level < 1 or p_level > 200 then
    raise exception 'level must be between 1 and 200';
  end if;
  select level into v_current from public.cypher_progress
   where profile_id = v_profile_id;
  if v_current is null then raise exception 'no progress record'; end if;
  if p_level <> v_current + 1 then
    raise exception 'levels unlock in order — next level is %', v_current + 1;
  end if;
  v_xp_gain := 10 + case when p_level = any (array[25,50,75,100,125,150,175,200])
                         then 50 else 0 end;
  update public.cypher_progress
     set level = p_level, xp = xp + v_xp_gain, stars = stars + 1,
         updated_at = now()
   where profile_id = v_profile_id
  returning xp, stars into v_xp, v_stars;
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_profile_id, 'level_complete',
          jsonb_build_object('level', p_level, 'xp_gain', v_xp_gain));
  if p_level = any (array[25,50,75,100,125,150,175,200]) then
    insert into public.cypher_events (profile_id, kind, detail)
    values (v_profile_id, 'gateway_unlocked',
            jsonb_build_object('level', p_level,
              'gateway', public._cypher_gateway(p_level),
              -- Plain-words note for the Owners Portal activity feed, so a
              -- parent sees WHAT the unlock means, not just the event kind.
              -- Gateway 1 (level 25) is the Live Desk opening.
              'note', case p_level
                when 25 then 'Gateway 1 cleared — the Live Desk is now open. Real market prices, $500 practice cap.'
                when 200 then 'Gateway 8 cleared — deposits uncapped. Trader Ready is next.'
                else 'Gateway ' || public._cypher_gateway(p_level) || ' cleared — deposit cap now $' || public._cypher_deposit_cap(p_level)::text || '.'
              end));
  end if;
  return jsonb_build_object(
    'level', p_level, 'xp', v_xp, 'stars', v_stars, 'xp_gain', v_xp_gain,
    'gateway', public._cypher_gateway(p_level),
    'trader_ready', public._cypher_trader_ready(v_profile_id));
end;
$$;

-- Change difficulty tier (e.g. Little Legends <-> Rookie). No progress lost.
create or replace function public.updatetier(p_token text, p_tier text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
begin
  if p_tier not in ('Little Legends', 'Rookie', 'Rookie · Kid Mode',
                    'Teen Trader', 'Adult Trader') then
    raise exception 'unknown tier';
  end if;
  update public.cypher_profiles set tier = p_tier where id = v_profile_id;
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_profile_id, 'tier_changed', jsonb_build_object('tier', p_tier));
  return jsonb_build_object('profile_id', v_profile_id, 'tier', p_tier);
end;
$$;

-- Move PRACTICE funds. kind 'deposit' adds, 'withdraw' removes.
-- Deposits are capped by cumulative lifetime deposits for the player's
-- gateway (see _cypher_deposit_cap); withdrawals never raise the cap.
-- Every move writes a ledger row with the balance after the move.
create or replace function public.walletmove(
  p_token text, p_kind text, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
  v_amount  numeric(14,2) := round(p_amount, 2);
  v_balance numeric;
  v_level   int;
  v_cap     numeric;
  v_deposited numeric;
  v_new_bal numeric;
begin
  if p_kind not in ('deposit', 'withdraw') then
    raise exception 'kind must be deposit or withdraw';
  end if;
  if v_amount <= 0 then raise exception 'amount must be above $0'; end if;
  v_balance := public._cypher_balance(v_profile_id);
  select level into v_level from public.cypher_progress
   where profile_id = v_profile_id;
  if p_kind = 'deposit' then
    v_cap := public._cypher_deposit_cap(v_level);
    if v_cap is not null then
      v_deposited := public._cypher_total_deposited(v_profile_id);
      if v_deposited + v_amount > v_cap then
        raise exception 'deposit cap: Gateway % allows $% total deposits and you have already deposited $%. Complete level % to raise it.',
          public._cypher_gateway(v_level), v_cap, v_deposited,
          public._cypher_next_gateway_level(v_level);
      end if;
    end if;
    v_new_bal := v_balance + v_amount;
    insert into public.cypher_wallet_ledger (profile_id, kind, amount, balance_after, note)
    values (v_profile_id, 'deposit', v_amount, v_new_bal, 'practice deposit');
  else
    if v_amount > v_balance then
      raise exception 'insufficient practice funds: balance is $%', v_balance;
    end if;
    v_new_bal := v_balance - v_amount;
    insert into public.cypher_wallet_ledger (profile_id, kind, amount, balance_after, note)
    values (v_profile_id, 'withdraw', -v_amount, v_new_bal, 'practice withdrawal');
  end if;
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_profile_id, 'wallet_' || p_kind,
          jsonb_build_object('amount', v_amount, 'balance', v_new_bal));
  return jsonb_build_object(
    'kind', p_kind, 'amount', v_amount, 'balance', v_new_bal,
    'account_value', public._cypher_account_value(v_profile_id));
end;
$$;

-- Generic event log (screen views, lesson events, celebrations).
-- detail->>'screen' is what the owner dashboard groups as "traffic by screen".
create or replace function public.logevent(
  p_token text, p_kind text, p_detail jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
  v_id uuid;
begin
  if p_kind is null or trim(p_kind) = '' then
    raise exception 'kind is required';
  end if;
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_profile_id, p_kind, coalesce(p_detail, '{}'::jsonb))
  returning id into v_id;
  return jsonb_build_object('event_id', v_id, 'kind', p_kind);
end;
$$;

-- ============================================================================
-- TRADING RPCs
-- ============================================================================

-- Trade Floor simulator: immediate trades on the 16 THEMED tickers only,
-- priced by the server-side simulated feed. The client passes the price it
-- saw from getprices(); the server re-computes the price and rejects the
-- trade if the passed price is more than 5% off (stale / spoofed feed).
-- Max 10 shares per trade. Same 2% risk rule, no-stop form.
create or replace function public.papertrade(
  p_token text, p_ticker text, p_side text, p_qty numeric, p_price numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
  v_server_price numeric;
  v_res jsonb;
begin
  if not public._cypher_is_themed(p_ticker) then
    raise exception 'Trade Floor trades themed tickers only (BOOM, BEAT, GOLD, ...). Real tickers live on the Live Desk.';
  end if;
  if p_side not in ('buy', 'sell') then raise exception 'side must be buy or sell'; end if;
  if p_qty <= 0 then raise exception 'qty must be above 0'; end if;
  if p_qty > 10 then raise exception 'Trade Floor max is 10 shares per trade'; end if;
  v_server_price := public._cypher_sim_price(p_ticker, current_date);
  if v_server_price is null then raise exception 'unknown themed ticker'; end if;
  if p_price is null or p_price <= 0 then
    raise exception 'a current simulated price is required — call getprices() first';
  end if;
  if abs(p_price - v_server_price) / v_server_price > 0.05 then
    raise exception 'stale price — the simulated feed moved. Refresh getprices() and try again.';
  end if;
  perform public._cypher_check_risk(v_profile_id, v_server_price, p_qty, null);
  v_res := public._cypher_execute_trade(v_profile_id, p_ticker, p_side, p_qty, v_server_price);
  perform public._cypher_mark_skill(v_profile_id, 'market_order');
  return v_res;
end;
$$;

-- Live Desk: real tickers only (AAPL, MSFT, NVDA, AMZN, TSLA, META, GOOGL,
-- AMD). Locked until Gateway 1 (level 25).
--
-- PRICE HONESTY NOTE: this signature carries NO price argument, so the
-- server prices every order from the cached real quotes
-- (cypher_quotes_cache, refreshed from data/quotes.json). The price the
-- client saw in quotes.json is NEVER trusted for validation — the server
-- is the authority. If the cache is empty/stale, market orders fail with
-- "live feed unavailable" instead of trading on a guess.
--
--   market:      fills immediately at the cached price.
--   limit:       fills when price <= limit_price (buy) / >= limit_price (sell).
--   stop:        fills when price >= stop_price (buy) / <= stop_price (sell).
--   take_profit: sell only; fills when price >= limit_price (the trigger).
-- Pending orders are evaluated lazily on every getliveprices() /
-- placeorder() call against the latest cache, and fill at the CURRENT
-- cached price. An order that can no longer be afforded/covered expires.
create or replace function public.placeorder(
  p_token text, p_ticker text, p_side text, p_order_type text,
  p_qty numeric, p_limit_price numeric default null,
  p_stop_price numeric default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
  v_level   int;
  v_balance numeric;
  v_price   numeric;  -- cached real price (entry for market orders)
  v_entry   numeric;  -- entry price used by the risk check
  v_stop_risk numeric;
  v_shares  numeric;
  v_order_id uuid;
  v_status  text;
  v_filled  numeric;
  v_res     jsonb;
begin
  select level into v_level from public.cypher_progress
   where profile_id = v_profile_id;
  if public._cypher_gateway(v_level) < 1 then
    raise exception 'Live Desk unlocks at Gateway 1 — complete level 25 first';
  end if;
  if not public._cypher_is_live(p_ticker) then
    raise exception 'Live Desk trades real tickers only (AAPL, MSFT, NVDA, AMZN, TSLA, META, GOOGL, AMD). Themed tickers live on the Trade Floor.';
  end if;
  if p_side not in ('buy', 'sell') then raise exception 'side must be buy or sell'; end if;
  if p_order_type not in ('market', 'limit', 'stop', 'take_profit') then
    raise exception 'order_type must be market, limit, stop or take_profit';
  end if;
  if p_qty <= 0 then raise exception 'qty must be above 0'; end if;
  if p_order_type = 'take_profit' and p_side <> 'sell' then
    raise exception 'take-profit orders are sell orders';
  end if;
  if p_order_type = 'limit' and (p_limit_price is null or p_limit_price <= 0) then
    raise exception 'limit orders need a limit_price above $0';
  end if;
  if p_order_type = 'stop' and (p_stop_price is null or p_stop_price <= 0) then
    raise exception 'stop orders need a stop_price above $0';
  end if;
  if p_order_type = 'take_profit' and (p_limit_price is null or p_limit_price <= 0) then
    raise exception 'take-profit orders need a limit_price (the trigger) above $0';
  end if;

  v_price := public._cypher_live_price(p_ticker);
  if v_price is null then
    raise exception 'live feed unavailable — quotes have not refreshed yet. Try again in a few minutes.';
  end if;

  -- Risk entry: the price the trade is actually entered at (or aimed at).
  -- For a stop order the stop_price IS the entry trigger, so it is not
  -- also a protective stop for the risk math (that would price risk at $0).
  v_entry := case p_order_type
    when 'limit' then p_limit_price
    when 'take_profit' then p_limit_price
    when 'stop' then p_stop_price
    else v_price end;
  v_stop_risk := case when p_order_type in ('market', 'limit', 'take_profit')
                      then p_stop_price else null end;
  perform public._cypher_check_risk(v_profile_id, v_entry, p_qty, v_stop_risk);

  -- Funds / shares, checked at placement AND re-checked at fill time.
  v_balance := public._cypher_balance(v_profile_id);
  if p_side = 'buy' then
    if p_qty > public._cypher_max_buy(v_level) then
      raise exception 'max buy size at Gateway % is % shares per order',
        public._cypher_gateway(v_level), public._cypher_max_buy(v_level);
    end if;
    if p_qty * v_entry > v_balance then
      raise exception 'insufficient practice funds: this order needs $% but your balance is $%',
        round(p_qty * v_entry, 2), v_balance;
    end if;
  else
    select shares into v_shares from public.cypher_holdings
     where profile_id = v_profile_id and ticker = p_ticker;
    if coalesce(v_shares, 0) < p_qty then
      raise exception 'insufficient shares: you hold % %', coalesce(v_shares, 0), p_ticker;
    end if;
  end if;

  if p_order_type = 'market' then
    v_res := public._cypher_execute_trade(v_profile_id, p_ticker, p_side, p_qty, v_price);
    insert into public.cypher_orders
      (profile_id, desk, ticker, side, order_type, qty, limit_price, stop_price,
       status, filled_price, filled_at)
    values (v_profile_id, 'live', p_ticker, p_side, 'market', p_qty,
            p_limit_price, p_stop_price, 'filled', v_price, now())
    returning id into v_order_id;
    perform public._cypher_mark_skill(v_profile_id, 'market_order');
    if p_stop_price is not null then
      perform public._cypher_mark_skill(v_profile_id, 'stop_loss');
    end if;
    insert into public.cypher_events (profile_id, kind, detail)
    values (v_profile_id, 'order_placed', jsonb_build_object(
      'order_id', v_order_id, 'ticker', p_ticker, 'side', p_side,
      'order_type', 'market', 'qty', p_qty, 'filled_price', v_price));
    return jsonb_build_object(
      'order_id', v_order_id, 'ticker', p_ticker, 'side', p_side,
      'order_type', 'market', 'qty', p_qty, 'status', 'filled',
      'filled_price', v_price, 'balance', v_res ->> 'balance');
  end if;

  -- Pending order: record it, mark "set" skills, then evaluate immediately
  -- in case the trigger is already touched at the current cached price.
  insert into public.cypher_orders
    (profile_id, desk, ticker, side, order_type, qty, limit_price, stop_price, status)
  values (v_profile_id, 'live', p_ticker, p_side, p_order_type, p_qty,
          p_limit_price, p_stop_price, 'open')
  returning id into v_order_id;
  if p_stop_price is not null then
    perform public._cypher_mark_skill(v_profile_id, 'stop_loss');
  end if;
  if p_order_type = 'take_profit' then
    perform public._cypher_mark_skill(v_profile_id, 'take_profit');
  end if;
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_profile_id, 'order_placed', jsonb_build_object(
    'order_id', v_order_id, 'ticker', p_ticker, 'side', p_side,
    'order_type', p_order_type, 'qty', p_qty,
    'limit_price', p_limit_price, 'stop_price', p_stop_price));
  perform public._cypher_evaluate_fills(v_profile_id);
  select status, filled_price into v_status, v_filled
    from public.cypher_orders where id = v_order_id;
  return jsonb_build_object(
    'order_id', v_order_id, 'ticker', p_ticker, 'side', p_side,
    'order_type', p_order_type, 'qty', p_qty, 'status', v_status,
    'limit_price', p_limit_price, 'stop_price', p_stop_price,
    'filled_price', v_filled, 'balance', public._cypher_balance(v_profile_id));
end;
$$;

-- Cancel an open order. Filled / cancelled / expired orders cannot be cancelled.
create or replace function public.cancelorder(p_token text, p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
  v_status text;
begin
  select status into v_status from public.cypher_orders
   where id = p_order_id and profile_id = v_profile_id;
  if v_status is null then raise exception 'order not found'; end if;
  if v_status <> 'open' then
    raise exception 'only open orders can be cancelled (this one is %)', v_status;
  end if;
  update public.cypher_orders set status = 'cancelled' where id = p_order_id;
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_profile_id, 'order_cancelled',
          jsonb_build_object('order_id', p_order_id));
  return jsonb_build_object('order_id', p_order_id, 'status', 'cancelled');
end;
$$;

-- List the player's orders: open orders first, then the most recent
-- filled / cancelled / expired ones (limit 20). Lets the Live Desk show
-- open orders after a reload, not just orders placed in this session.
create or replace function public.getorders(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'order_id', o.id, 'desk', o.desk, 'ticker', o.ticker,
             'side', o.side, 'order_type', o.order_type, 'qty', o.qty,
             'limit_price', o.limit_price, 'stop_price', o.stop_price,
             'status', o.status, 'filled_price', o.filled_price,
             'created_at', o.created_at, 'filled_at', o.filled_at)
           order by (o.status = 'open') desc, o.created_at desc)
      from (select * from public.cypher_orders
             where profile_id = v_profile_id
             order by (status = 'open') desc, created_at desc
             limit 20) o),
    '[]'::jsonb);
end;
$$;

-- REAL price feed (from the quotes cache). No auth required — prices are
-- public. Calling this also lazily evaluates pending Live Desk fills for
-- every player against the latest cache. Response is labelled REAL and
-- carries the honest feed state (live / delayed / market_closed /
-- feed_unreachable) plus last close + as-of time per ticker.
create or replace function public.getliveprices()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_payload  jsonb;
  v_fetched  timestamptz;
  v_state    text;
begin
  perform public._cypher_evaluate_fills(null);
  select payload, fetched_at into v_payload, v_fetched
    from public.cypher_quotes_cache where id = 1;
  v_state := public._cypher_feed_state();
  if v_payload is null then
    return jsonb_build_object(
      'simulated', false,
      'label', 'REAL MARKET DATA — Yahoo Finance, via the quotes Action',
      'feedState', 'feed_unreachable',
      'asOf', null, 'fetchedAt', null, 'tickers', '{}'::jsonb,
      'note', 'No quotes cached yet. The quotes Action has not run, or the frontend has not pushed data/quotes.json into the cache.');
  end if;
  return jsonb_build_object(
    'simulated', false,
    'label', 'REAL MARKET DATA — Yahoo Finance, via the quotes Action',
    'feedState', v_state,
    'asOf', v_payload ->> 'asOf',
    'fetchedAt', v_fetched,
    'marketState', v_payload ->> 'marketState',
    'tickers', coalesce(v_payload -> 'tickers', '{}'::jsonb),
    'note', case v_state
      when 'live' then 'Market is open and quotes are fresh (under 15 minutes old).'
      when 'delayed' then 'Market is open but quotes are 15-30 minutes old — prices may lag the real market.'
      when 'market_closed' then 'Market is closed. Prices shown are the last close.'
      else 'Quotes are stale or missing — prices shown may be out of date. Trading on the Live Desk is paused until the feed refreshes.' end);
end;
$$;

-- SIMULATED Trade Floor feed (RPC-computed deterministic seeded walk).
-- No auth required. Every response is labelled SIMULATED PRACTICE, and
-- every ticker carries 30 daily candles. Prices change once a day
-- (they are a function of ticker + date), not tick-by-tick.
create or replace function public.getprices()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tickers jsonb := '{}'::jsonb;
  v_candles jsonb;
  v_price   numeric;
  v_prev    numeric;
  v_o       numeric;
  v_c       numeric;
  v_d       date;
  v_i       int;
  v_t_ms    bigint;
  v_vol     int;
  r record;
begin
  for r in select * from (values
      ('BOOM','BoomBox Audio Co.'), ('BEAT','BeatWorks Streaming'),
      ('GOLD','GoldChain Records Group'), ('VINYL','Vinyl Revival Inc.'),
      ('FLOW','FlowState Media'), ('MIC','MicDrop Technologies'),
      ('HUSTLE','Hustle Athletics'), ('EMPIRE','Empire Estates REIT'),
      ('LEGACY','Legacy Sneaker Co.'), ('CYPHER','Cypher Cloud Systems'),
      ('BASS','BassLine Energy'), ('TEMPO','Tempo Health Group'),
      ('CROWN','Crown Barbers Brands'), ('STUDIO','Studio City Films'),
      ('BLOCK','BlockParty Foods'), ('TURNTBL','Turntable Toys Inc.')
    ) as v(sym, name)
  loop
    v_price := public._cypher_sim_price(r.sym, current_date);
    v_prev  := public._cypher_sim_price(r.sym, current_date - 1);
    v_candles := '[]'::jsonb;
    for v_i in reverse 29 .. 0 loop
      v_d := current_date - v_i;
      v_o := public._cypher_sim_price(r.sym, v_d - 1);
      v_c := public._cypher_sim_price(r.sym, v_d);
      v_t_ms := (extract(epoch from (v_d::timestamp)) * 1000)::bigint;
      v_vol := 100000 + ((hashtext(r.sym || v_d::text) % 900000) + 900000) % 900000;
      -- High/low are a +/-0.5% band around open/close: this feed is a
      -- daily practice walk, not real ticks. See API.md.
      v_candles := v_candles || jsonb_build_array(jsonb_build_array(
        v_t_ms, v_o, round(greatest(v_o, v_c) * 1.005, 2),
        round(least(v_o, v_c) * 0.995, 2), v_c, v_vol));
    end loop;
    v_tickers := jsonb_set(v_tickers, array[r.sym], jsonb_build_object(
      'name', r.name, 'price', v_price, 'prevClose', v_prev,
      'changePct', round((v_price - v_prev) / v_prev * 100, 2),
      'candles', v_candles));
  end loop;
  return jsonb_build_object(
    'asOf', current_date::text,
    'simulated', true,
    'label', 'SIMULATED PRACTICE — these prices are made up for learning, not real market data',
    'tickers', v_tickers);
end;
$$;

-- Refresh the real-quotes cache from data/quotes.json. The frontend fetches
-- quotes.json same-origin and POSTs its contents here.
-- Guards (the only auth this signature allows):
--   * payload must carry asOf + all 8 live tickers with prices > 0;
--   * asOf must be NEWER than the cached asOf (stale payloads rejected)
--     and not more than 15 minutes in the future;
--   * no single ticker may move more than 20% vs the previous cache
--     (a bad file or a wild print is rejected, cache untouched).
-- On success, pending Live Desk fills are evaluated against the new prices.
-- HONEST LIMIT: this endpoint takes no token by design of its signature,
-- so anyone with the anon key can call it — the sanity band above is the
-- guard. If abuse ever appears, add an ingest secret (see API.md).
create or replace function public.cypher_cache_quotes(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_asof     timestamptz;
  v_old_asof timestamptz;
  v_old_px   numeric;
  v_new_px   numeric;
  v_sym      text;
begin
  if p_payload is null or not (p_payload ? 'asOf') or not (p_payload ? 'tickers') then
    raise exception 'payload must be an object with asOf and tickers';
  end if;
  begin
    v_asof := (p_payload ->> 'asOf')::timestamptz;
  exception when others then
    raise exception 'asOf must be an ISO-8601 timestamp';
  end;
  if v_asof > now() + interval '15 minutes' then
    raise exception 'asOf is in the future — refusing payload';
  end if;
  foreach v_sym in array array['AAPL','MSFT','NVDA','AMZN','TSLA','META','GOOGL','AMD'] loop
    begin
      v_new_px := (p_payload -> 'tickers' -> v_sym ->> 'price')::numeric;
    exception when others then
      raise exception 'ticker % is missing a numeric price', v_sym;
    end;
    if v_new_px is null or v_new_px <= 0 then
      raise exception 'ticker % is missing a numeric price above $0', v_sym;
    end if;
  end loop;
  select nullif(payload ->> 'asOf', '')::timestamptz into v_old_asof
    from public.cypher_quotes_cache where id = 1;
  if v_old_asof is not null and v_asof <= v_old_asof then
    raise exception 'stale payload: asOf % is not newer than cached asOf %', v_asof, v_old_asof;
  end if;
  foreach v_sym in array array['AAPL','MSFT','NVDA','AMZN','TSLA','META','GOOGL','AMD'] loop
    select nullif(payload -> 'tickers' -> v_sym ->> 'price', '')::numeric into v_old_px
      from public.cypher_quotes_cache where id = 1;
    if v_old_px is not null and v_old_px > 0 then
      v_new_px := (p_payload -> 'tickers' -> v_sym ->> 'price')::numeric;
      if abs(v_new_px - v_old_px) / v_old_px > 0.20 then
        raise exception 'sanity band: % moved %%% vs the previous cache — refusing payload',
          v_sym, round(abs(v_new_px - v_old_px) / v_old_px * 100, 1);
      end if;
    end if;
  end loop;
  insert into public.cypher_quotes_cache (id, payload, fetched_at)
  values (1, p_payload, now())
  on conflict (id) do update set payload = excluded.payload, fetched_at = now();
  perform public._cypher_evaluate_fills(null);
  return jsonb_build_object(
    'ok', true, 'asOf', v_asof, 'tickers', 8,
    'feedState', public._cypher_feed_state());
end;
$$;

-- ============================================================================
-- OWNER RPCs (Tye's Owners Portal — the gift recipient's dashboard)
-- ============================================================================

-- Is there an owner account yet? The frontend calls this on first run to
-- decide whether to show the owner setup screen.
create or replace function public.ownerstatus()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'owner_exists', exists (select 1 from public.cypher_owners));
$$;

-- Create the SINGLE owner account. Fails if one already exists — there is
-- no "second owner" and no reset path here; a reset needs a dashboard run
-- (see the verification queries at the end of this file).
-- Access code: at least 6 characters, stored ONLY as a bcrypt hash.
create or replace function public.setupowner(
  p_name text, p_owner_id text, p_access_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner_id text := lower(trim(p_owner_id));
  v_id uuid;
begin
  if exists (select 1 from public.cypher_owners) then
    raise exception 'an owner account already exists';
  end if;
  if v_owner_id !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'owner_id must be 3-30 letters, numbers or underscores';
  end if;
  if p_name is null or trim(p_name) = '' then raise exception 'name is required'; end if;
  if char_length(p_access_code) < 6 then
    raise exception 'access code must be at least 6 characters';
  end if;
  insert into public.cypher_owners (owner_id, name, access_code_hash)
  values (v_owner_id, trim(p_name), crypt(p_access_code, gen_salt('bf')))
  returning id into v_id;
  return jsonb_build_object('owner_id', v_owner_id, 'name', trim(p_name));
end;
$$;

-- Owner sign-in. Returns a 7-day owner token for getownerdashboard().
create or replace function public.loginowner(p_owner_id text, p_access_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_token text;
  v_expires timestamptz;
begin
  select * into r from public.cypher_owners
   where owner_id = lower(trim(p_owner_id));
  if r.id is null or r.access_code_hash <> crypt(p_access_code, r.access_code_hash) then
    raise exception 'invalid owner_id or access code';
  end if;
  delete from public.cypher_owner_sessions
   where owner_id = r.id and expires_at <= now();
  insert into public.cypher_owner_sessions (owner_id)
  values (r.id) returning token, expires_at into v_token, v_expires;
  return jsonb_build_object(
    'token', v_token, 'owner_id', r.owner_id, 'name', r.name,
    'expires_at', v_expires);
end;
$$;

-- Owner dashboard: totals, traffic by screen, event counts, player roster,
-- live activity feed. Owner token required. No PINs, hashes, or session
-- tokens are ever returned here.
create or replace function public.getownerdashboard(p_owner_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid := public._cypher_owner_auth(p_owner_token);
begin
  -- Weekly standings come from the server-side 'level_complete' events
  -- (detail carries xp_gain), so no new table is needed. Only server
  -- events count: the frontend also logs a 'level_complete' screen event
  -- without xp_gain, which the `detail ? 'xp_gain'` filter excludes.
  -- Window is a rolling 7 days, labelled "last 7 days" in the portal.
  return (
    with weekly as (
      select profile_id,
             sum((detail ->> 'xp_gain')::int) as weekly_xp,
             count(*) as weekly_levels
        from public.cypher_events
       where kind = 'level_complete'
         and detail ? 'xp_gain'
         and created_at >= now() - interval '7 days'
       group by profile_id
    )
    select jsonb_build_object(
    'totals', jsonb_build_object(
      'players', (select count(*) from public.cypher_profiles),
      'trader_ready', (select count(*) from public.cypher_profiles p
                        where public._cypher_trader_ready(p.id)),
      'levels_completed', (select coalesce(sum(level), 0) from public.cypher_progress),
      'total_xp', (select coalesce(sum(xp), 0) from public.cypher_progress),
      'total_deposited', (select coalesce(sum(amount), 0) from public.cypher_wallet_ledger where kind = 'deposit'),
      'total_withdrawn', (select coalesce(sum(-amount), 0) from public.cypher_wallet_ledger where kind = 'withdraw'),
      'total_practice_cash', (select coalesce(sum(public._cypher_balance(p.id)), 0) from public.cypher_profiles p),
      'live_orders', (select count(*) from public.cypher_orders where desk = 'live'),
      'live_orders_filled', (select count(*) from public.cypher_orders where desk = 'live' and status = 'filled'),
      'trade_floor_trades', (select count(*) from public.cypher_events where kind = 'trade' and detail ->> 'desk' = 'trade_floor'),
      'events_total', (select count(*) from public.cypher_events)),
    'traffic_by_screen', coalesce((
      select jsonb_agg(jsonb_build_object('screen', screen, 'events', n)
                       order by n desc)
        from (select coalesce(detail ->> 'screen', '(no screen)') as screen,
                     count(*) as n
                from public.cypher_events
               group by 1) s),
      '[]'::jsonb),
    'events_by_kind', coalesce((
      select jsonb_agg(jsonb_build_object('kind', kind, 'events', n)
                       order by n desc)
        from (select kind, count(*) as n
                from public.cypher_events group by 1) s),
      '[]'::jsonb),
    -- FAMILY LEADERBOARD — ranked by XP earned in the last 7 days
    -- (weekly_xp desc), NOT by total XP, so every week starts fresh.
    -- Ties break on levels completed this week, then total level, then XP.
    'leaderboard', coalesce((
      select jsonb_agg(jsonb_build_object(
               'username', p.username, 'display_name', p.display_name,
               'tier', p.tier, 'level', pr.level, 'xp', pr.xp,
               'weekly_xp', coalesce(w.weekly_xp, 0),
               'weekly_levels', coalesce(w.weekly_levels, 0))
             order by coalesce(w.weekly_xp, 0) desc, coalesce(w.weekly_levels, 0) desc, pr.level desc, pr.xp desc)
        from public.cypher_profiles p
        join public.cypher_progress pr on pr.profile_id = p.id
        left join weekly w on w.profile_id = p.id),
      '[]'::jsonb),
    'roster', coalesce((
      select jsonb_agg(jsonb_build_object(
               'username', p.username, 'display_name', p.display_name,
               'tier', p.tier, 'level', pr.level, 'xp', pr.xp,
               'stars', pr.stars, 'balance', public._cypher_balance(p.id),
               'account_value', public._cypher_account_value(p.id),
               'discipline_score', public._cypher_discipline(p.id),
               'trader_ready', public._cypher_trader_ready(p.id),
               'weekly_xp', coalesce(w.weekly_xp, 0),
               'weekly_levels', coalesce(w.weekly_levels, 0),
               'joined', p.created_at,
               'last_active', (select max(created_at) from public.cypher_events e
                                where e.profile_id = p.id))
             order by pr.level desc, pr.xp desc)
        from public.cypher_profiles p
        join public.cypher_progress pr on pr.profile_id = p.id
        left join weekly w on w.profile_id = p.id),
      '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
               'username', p.username, 'kind', e.kind,
               'detail', e.detail, 'created_at', e.created_at)
             order by e.created_at desc)
        from (select * from public.cypher_events
               order by created_at desc limit 50) e
        left join public.cypher_profiles p on p.id = e.profile_id),
      '[]'::jsonb))
  );
end;
$$;

-- ============================================================================
-- GRANTS — the frontend (anon key) may call the RPCs, nothing else.
-- Internal _cypher_* helpers get NO grant on purpose.
-- ============================================================================

grant execute on function public.createprofile(text, text, text, text) to anon, authenticated;
grant execute on function public.loginprofile(text, text) to anon, authenticated;
grant execute on function public.getsession(text) to anon, authenticated;
grant execute on function public.completelevel(text, integer) to anon, authenticated;
grant execute on function public.updatetier(text, text) to anon, authenticated;
grant execute on function public.walletmove(text, text, numeric) to anon, authenticated;
grant execute on function public.papertrade(text, text, text, numeric, numeric) to anon, authenticated;
grant execute on function public.placeorder(text, text, text, text, numeric, numeric, numeric) to anon, authenticated;
grant execute on function public.cancelorder(text, uuid) to anon, authenticated;
grant execute on function public.getorders(text) to anon, authenticated;
grant execute on function public.getliveprices() to anon, authenticated;
grant execute on function public.getprices() to anon, authenticated;
grant execute on function public.logevent(text, text, jsonb) to anon, authenticated;
grant execute on function public.setupowner(text, text, text) to anon, authenticated;
grant execute on function public.loginowner(text, text) to anon, authenticated;
grant execute on function public.ownerstatus() to anon, authenticated;
grant execute on function public.getownerdashboard(text) to anon, authenticated;
grant execute on function public.cypher_cache_quotes(jsonb) to anon, authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (commented — run by hand in the SQL editor after
-- the paste above, one block at a time; they only READ, except the two
-- clearly marked test-profile lines, which you should delete afterwards)
-- ============================================================================

-- 1. Tables exist, RLS on, no permissive policies:
--    select tablename, rowsecurity from pg_tables
--     where schemaname = 'public' and tablename like 'cypher\_%';
--    select * from pg_policies where schemaname = 'public'
--     and tablename like 'cypher\_%';  -- expect ZERO rows
--
-- 2. RPCs exist:
--    select proname from pg_proc where pronamespace = 'public'::regnamespace
--     and proname like '%profile%' or proname like 'cypher\_%' or proname like 'get%'
--    order by 1;
--
-- 3. No owner yet:
--    select public.ownerstatus();
--
-- 4. TEST PROFILE ONLY (delete the test user afterwards with the query in 8):
--    select public.createprofile('test_trader', 'Test Trader', '1234', 'Rookie');
--    select public.loginprofile('test_trader', '1234');  -- copy the token
--    select public.walletmove('<TOKEN>', 'deposit', 250);
--    select public.completelevel('<TOKEN>', 1);
--    select public.getsession('<TOKEN>');
--    select public.getprices();
--    select public.papertrade('<TOKEN>', 'BOOM', 'buy', 2, <BOOM-PRICE-FROM-getprices()>);
--    select public.getliveprices();  -- feed_unreachable until a cache exists
--
-- 5. Cache a hand-made quote payload (proves cypher_cache_quotes + band):
--    select public.cypher_cache_quotes('{"asOf": "2026-11-20T15:00:00Z", "marketState": "REGULAR", "tickers": {"AAPL": {"price": 250.00, "prevClose": 248.00, "open": 249.00, "high": 251.00, "low": 248.50, "changePct": 0.81, "candles": []}, "MSFT": {"price": 400.00, "prevClose": 398.00, "open": 399.00, "high": 401.00, "low": 398.50, "changePct": 0.50, "candles": []}, "NVDA": {"price": 180.00, "prevClose": 178.00, "open": 179.00, "high": 181.00, "low": 178.00, "changePct": 1.12, "candles": []}, "AMZN": {"price": 200.00, "prevClose": 199.00, "open": 199.50, "high": 201.00, "low": 198.50, "changePct": 0.50, "candles": []}, "TSLA": {"price": 300.00, "prevClose": 295.00, "open": 296.00, "high": 302.00, "low": 295.00, "changePct": 1.69, "candles": []}, "META": {"price": 600.00, "prevClose": 595.00, "open": 596.00, "high": 602.00, "low": 595.00, "changePct": 0.84, "candles": []}, "GOOGL": {"price": 280.00, "prevClose": 278.00, "open": 279.00, "high": 281.00, "low": 277.50, "changePct": 0.72, "candles": []}, "AMD": {"price": 220.00, "prevClose": 218.00, "open": 219.00, "high": 221.00, "low": 218.00, "changePct": 0.92, "candles": []}}}'::jsonb);
--    select public.getliveprices();
--
-- 6. Owner flow (run ONCE with the real owner_id + access code; the code is
--    hashed, never stored in plain text):
--    select public.setupowner('Tye', 'tye', '<CHOOSE-A-6-PLUS-CHARACTER-ACCESS-CODE>');
--    select public.loginowner('tye', '<SAME-CODE>');  -- copy the token
--    select public.getownerdashboard('<OWNER-TOKEN>');
--
-- 7. A second setupowner call must FAIL (single owner):
--    select public.setupowner('Someone Else', 'other', '123456');
--
-- 8. Clean up the test profile (cascades to progress/holdings/ledger/orders/events/sessions):
--    delete from public.cypher_profiles where username = 'test_trader';
--
-- 9. Family leaderboard + Gateway 1 note (new Nov 20, 2026):
--    With two test profiles at different weekly XP, the dashboard must
--    rank by weekly_xp (not total xp), and a level-25 completion must
--    leave a 'gateway_unlocked' event whose detail.note names the Live Desk:
--    select d -> 'leaderboard' from (select public.getownerdashboard('<OWNER-TOKEN>') d) s;
--    select kind, detail from public.cypher_events where kind = 'gateway_unlocked' order by created_at desc limit 1;
--
-- 10. EMERGENCY ONLY — reset the owner account (lets setupowner run again):
--    delete from public.cypher_owner_sessions;
--    delete from public.cypher_owners;
-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
