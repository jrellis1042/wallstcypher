-- ============================================================================
-- WALL ST. CYPHER — EMAIL RECOVERY MIGRATION (Nov 21, 2026)
-- ============================================================================
-- Paste this WHOLE file into the Supabase Dashboard -> SQL Editor for
-- project mkyrzikeqpqncgemlsds and press Run. It is the DELTA only:
-- the new email-recovery objects, extracted from supabase/schema.sql
-- (which carries the same code in full). Safe to re-run: tables use
-- IF NOT EXISTS, columns use IF NOT EXISTS, functions use
-- CREATE OR REPLACE.
--
-- DO NOT RUN until the Resend key exists (see step 2 below) — without
-- it, requestpinreset() raises "email reset is not set up yet" and the
-- frontend falls back to the owner reset, which is safe but not the
-- email flow Rashad asked for.
--
-- NOTE (Nov 21, 2026): this file ALSO carries the welcome-practice-
-- funds fix (updated createprofile + one-time backfill, below). That
-- part does NOT depend on Resend — it rides along in the same paste
-- only because both changes deploy in one pass. The createprofile text
-- here is byte-identical to supabase/schema.sql.
--
-- STEPS (in order):
--   1. Resend account: create one at resend.com (free tier:
--      100 emails/day, 3,000/month — plenty for a family game).
--      Verify wallstcypher.com as a sending domain (Resend gives 3 DNS
--      records to add at Spaceship) and create an API key (sending
--      access). NEVER put the key in the repo or the frontend.
--   2. Verify the key from the VM before touching the DB:
--      curl -s -o /dev/null -w '%{http_code}' https://api.resend.com/emails \
--        -H "Authorization: Bearer <KEY>" -H 'Content-Type: application/json' -d '{}'
--      401 = bad key. 400/422 = auth OK (empty body rejected) — good.
--   3. Paste THIS file into the SQL editor and Run. Then run the
--      verification queries at the end of this file.
--   4. Insert the key + From address (run once, with the REAL key):
--      insert into public.cypher_settings (key, value)
--      values ('resend_api_key', '<RE_...KEY>'),
--             ('resend_from', 'Wall St. Cypher <no-reply@wallstcypher.com>')
--      on conflict (key) do update set value = excluded.value, updated_at = now();
--   5. Deploy the frontend (email-recovery branch -> main) and run the
--      full-loop check in section 11 of schema.sql.
-- ============================================================================

-- EMAIL RECOVERY (added Nov 21, 2026 — Rashad: "Account recovery should
-- via email." Players reset their OWN PIN from the login screen; the
-- owner reset (resetplayerpin) stays as the fallback for players with
-- no recovery email on file.)
--
-- HOW IT WORKS
--   * profiles.recovery_email — OPTIONAL, collected at signup (labelled
--     parent/guardian email for Little Legends) and changeable after
--     sign-in. Never required: the game promises "no real names, no
--     birthdays" and never asks for an email to play; the owner reset
--     covers anyone without one.
--   * profiles.recovery_prompted_at — set when the player is asked once
--     after sign-in to add an email (or dismisses the ask), so the
--     prompt never nags every login.
--   * cypher_reset_tokens — one row per reset request. Only the SHA-256
--     hash of the token is stored, never the token itself. Single-use,
--     1-hour expiry. The link is https://wallstcypher.com/?reset=<token>.
--   * cypher_settings — server-side settings the RPCs read. Holds the
--     Resend API key (key 'resend_api_key') and the From address
--     (key 'resend_from', e.g. 'Wall St. Cypher <no-reply@wallstcypher.com>').
--     RLS deny-all: only SECURITY DEFINER RPCs read it. The key is
--     inserted by hand in the SQL editor after a Resend account is
--     created and wallstcypher.com is verified in Resend (DNS TXT
--     records at Spaceship) — there is no email key anywhere in the
--     repo, and no send route exists without one.
--   * Sending goes through Resend's HTTP API via pg_net (net.http_post),
--     called from inside requestpinreset — no Edge Function, no new
--     deploy surface. pg_net is async: the call queues the send and the
--     RPC returns the same generic answer either way.
--   * requestpinreset() NEVER enumerates: unknown username, or a player
--     with no email on file, gets the exact same {ok: true} as a real
--     send. If the Resend key is not configured it raises instead, so
--     the frontend can tell the player to ask the owner rather than
--     wait on an email that will never arrive.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

alter table public.cypher_profiles
  add column if not exists recovery_email text
    check (recovery_email is null
           or (char_length(recovery_email) <= 254
               and recovery_email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'));
alter table public.cypher_profiles
  add column if not exists recovery_prompted_at timestamptz;

create table if not exists public.cypher_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cypher_reset_tokens (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.cypher_profiles (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists idx_cypher_reset_tokens_profile
  on public.cypher_reset_tokens (profile_id);
create index if not exists idx_cypher_reset_tokens_hash
  on public.cypher_reset_tokens (token_hash);

alter table public.cypher_settings     enable row level security;
alter table public.cypher_reset_tokens  enable row level security;
revoke all on public.cypher_settings     from anon, authenticated;
revoke all on public.cypher_reset_tokens  from anon, authenticated;

-- Ask for a PIN reset email. Generic {ok: true} in EVERY case where an
-- email cannot be sent to this username (unknown username, or no email
-- on file) — the caller can never tell which. One active token at a
-- time; while a live token exists no second email is sent
-- (rate limit, no inbox spam) — the player uses the link already sent.
create or replace function public.requestpinreset(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_username   text := lower(trim(p_username));
  r            record;
  v_token      text;
  v_token_hash text;
  v_key        text;
  v_from       text;
  v_url        text;
  v_req_id     bigint;
begin
  select id, recovery_email into r
    from public.cypher_profiles where username = v_username;
  if r.id is null or r.recovery_email is null then
    return jsonb_build_object('ok', true);
  end if;

  delete from public.cypher_reset_tokens
   where profile_id = r.id and (used_at is not null or expires_at <= now());
  select token_hash into v_token_hash
    from public.cypher_reset_tokens
   where profile_id = r.id and used_at is null and expires_at > now()
   order by created_at desc limit 1;
  if v_token_hash is not null then
    return jsonb_build_object('ok', true);
  end if;

  select value into v_key from public.cypher_settings where key = 'resend_api_key';
  if v_key is null or v_key = '' then
    raise exception 'email reset is not set up yet — ask the owner to reset your PIN from the Owners Portal';
  end if;
  select value into v_from from public.cypher_settings where key = 'resend_from';
  if v_from is null or v_from = '' then
    v_from := 'Wall St. Cypher <no-reply@wallstcypher.com>';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  insert into public.cypher_reset_tokens (profile_id, token_hash, expires_at)
  values (r.id, v_token_hash, now() + interval '1 hour');

  v_url := 'https://wallstcypher.com/?reset=' || v_token;
  v_req_id := net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key),
    body := jsonb_build_object(
      'from', v_from,
      'to', jsonb_build_array(r.recovery_email),
      'subject', 'Reset your Wall St. Cypher PIN',
      'html', '<p>Someone asked to reset the PIN for Wall St. Cypher player <b>' || v_username || '</b>.</p>'
        || '<p><a href="' || v_url || '">Tap here to set a new 4-digit PIN</a> — the link works once and expires in 1 hour.</p>'
        || '<p>If you did not ask for this, ignore this email. Your levels, XP and practice wallet stay exactly as they are.</p>'
        || '<p>Wall St. Cypher — practice funds only, no real money, ever.</p>'));
  return jsonb_build_object('ok', true);
end;
$$;

-- Set a new PIN with a reset link token. Single-use, 1-hour expiry; a
-- bad or expired token and a wrong token give the same error. On
-- success every session for the player is ended (sign in again with
-- the new PIN) and the reset is logged as via 'email'.
create or replace function public.resetpinwithtoken(p_token text, p_new_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_hash       text := encode(digest(nullif(trim(p_token), ''), 'sha256'), 'hex');
  v_profile_id uuid;
  v_username   text;
begin
  if p_new_pin !~ '^[0-9]{4}$' then
    raise exception 'new PIN must be exactly 4 digits';
  end if;
  select t.profile_id into v_profile_id
    from public.cypher_reset_tokens t
   where t.token_hash = v_hash and t.used_at is null and t.expires_at > now();
  if v_profile_id is null then
    raise exception 'this reset link is invalid or expired — ask for a new one, or ask the owner to reset your PIN';
  end if;
  update public.cypher_profiles set pin_hash = crypt(p_new_pin, gen_salt('bf'))
   where id = v_profile_id returning username into v_username;
  update public.cypher_reset_tokens set used_at = now()
   where token_hash = v_hash;
  delete from public.cypher_sessions where profile_id = v_profile_id;
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_profile_id, 'pin_reset',
          jsonb_build_object('username', v_username, 'via', 'email'));
  return jsonb_build_object('username', v_username, 'pin_reset', true);
end;
$$;

-- Set (or change) the signed-in player's recovery email. Empty string
-- clears it. Marks the player as prompted either way, so the
-- post-sign-in ask never shows again for them.
create or replace function public.setrecoveryemail(p_token text, p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email = '' then
    update public.cypher_profiles
       set recovery_email = null, recovery_prompted_at = now()
     where id = v_profile_id;
    return jsonb_build_object('recovery_email_set', false);
  end if;
  if char_length(v_email) > 254
     or v_email !~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'that email does not look right — check it and try again';
  end if;
  update public.cypher_profiles
     set recovery_email = v_email, recovery_prompted_at = now()
   where id = v_profile_id;
  return jsonb_build_object('recovery_email_set', true);
end;
$$;

-- "Not now" on the post-sign-in recovery-email ask. Records the ask so
-- it shows once only — the player can still add an email later from
-- the start screen.
create or replace function public.dismissrecoveryprompt(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid := public._cypher_auth(p_token);
begin
  update public.cypher_profiles set recovery_prompted_at = now()
   where id = v_profile_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================================
-- getsession() gains two additive profile fields (no signature change,
-- so its existing grant still applies): recovery_email_set and
-- recovery_prompted. The frontend uses them to show the post-sign-in
-- recovery-email ask once only.
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
      'created_at', r.created_at,
      'recovery_email_set', (r.recovery_email is not null),
      'recovery_prompted', (r.recovery_prompted_at is not null)),
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

grant execute on function public.requestpinreset(text) to anon, authenticated;
grant execute on function public.resetpinwithtoken(text, text) to anon, authenticated;
grant execute on function public.setrecoveryemail(text, text) to anon, authenticated;
grant execute on function public.dismissrecoveryprompt(text) to anon, authenticated;

-- ============================================================================
-- WELCOME PRACTICE FUNDS (Nov 21, 2026 fix — independent of Resend)
-- A fresh profile started with a $0 wallet, so Level 1 was unplayable:
-- Buy/Sell failed with no usable message until the player found the
-- Wallet tab and funded it by hand. createprofile now grants the full
-- Gateway-0 deposit cap ($250) at signup, server-side, so it cannot be
-- skipped. The grant counts toward the lifetime deposit cap, so it
-- creates no extra headroom. Text below is byte-identical to
-- supabase/schema.sql.
-- ============================================================================

-- Create a profile. PIN is exactly 4 digits; only its bcrypt hash is stored.
-- Username is lowercased and must be unique. Returns the new profile.
-- Welcome practice funds (Nov 21, 2026 fix): the profile starts with a
-- $250 'deposit' ledger row — the full Gateway-0 deposit cap — so a new
-- player can trade from Level 1. Without it a fresh wallet is $0 and
-- every Buy fails with no usable message. The grant counts toward the
-- lifetime deposit cap, so it creates no extra headroom.
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
  insert into public.cypher_wallet_ledger (profile_id, kind, amount, balance_after, note)
  values (v_id, 'deposit', 250, 250, 'welcome practice funds');
  insert into public.cypher_events (profile_id, kind, detail)
  values (v_id, 'profile_created',
          jsonb_build_object('username', v_username, 'tier', p_tier));
  return jsonb_build_object(
    'profile_id', v_id, 'username', v_username,
    'display_name', v_display, 'tier', p_tier, 'level', 0, 'xp', 0);
end;
$$;

-- One-time backfill (safe to re-run): profiles that signed up BEFORE
-- the grant and never deposited anything get the same $250. The
-- "never deposited" guard means a player who already used their $250
-- cap and spent it down to $0 gets nothing extra.
insert into public.cypher_wallet_ledger (profile_id, kind, amount, balance_after, note)
select p.id, 'deposit', 250, 250, 'welcome practice funds'
  from public.cypher_profiles p
 where not exists (select 1 from public.cypher_wallet_ledger l
                    where l.profile_id = p.id and l.kind = 'deposit')
   and coalesce((select sum(amount) from public.cypher_wallet_ledger
                  where profile_id = p.id), 0) = 0;

-- ============================================================================
-- VERIFICATION (run after the paste above, one block at a time)
-- ============================================================================
-- 1. New objects exist:
--    select proname from pg_proc where pronamespace = 'public'::regnamespace
--     and proname in ('requestpinreset','resetpinwithtoken','setrecoveryemail','dismissrecoveryprompt')
--    order by 1;  -- expect all four
--    select column_name from information_schema.columns
--     where table_name = 'cypher_profiles'
--       and column_name in ('recovery_email','recovery_prompted_at');
--    select * from pg_extension where extname = 'pg_net';  -- must return a row
--    select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--     where p.proname like 'http_%';  -- expect net.http_post (schema may be net)
-- 2. No-enumeration check — unknown username returns ok, no token row:
--    select public.requestpinreset('no_such_player_xyz');  -- expect {"ok": true}
--    select count(*) from public.cypher_reset_tokens;  -- expect 0
-- 3. Full loop on a throwaway profile (delete it afterwards):
--    select public.createprofile('recovery_test', 'Recovery Test', '1234', 'Rookie');
--    select public._cypher_balance(id) from public.cypher_profiles
--     where username = 'recovery_test';  -- expect 250.00 (welcome grant)
--    select public.loginprofile('recovery_test', '1234');  -- copy the token
--    select public.setrecoveryemail('<TOKEN>', 'rashad@example.com');
--    select public.requestpinreset('recovery_test');  -- expect {"ok": true}; check the inbox for the link
--    select public.resetpinwithtoken('<TOKEN-FROM-THE-LINK>', '4321');  -- expect pin_reset true
--    select public.loginprofile('recovery_test', '4321');  -- new PIN works; old PIN must fail
--    select public.resetpinwithtoken('<SAME-TOKEN>', '9999');  -- must FAIL (single-use)
--    delete from public.cypher_profiles where username = 'recovery_test';
-- ============================================================================
-- END OF EMAIL RECOVERY MIGRATION
-- ============================================================================
