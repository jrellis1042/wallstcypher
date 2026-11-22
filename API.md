# Wall St. Cypher — Backend API Contract

Standalone rebuild of the Wall St. Cypher trading game (kids + adults).
Frontend: static single-page app on GitHub Pages (`jrellis1042/wallstcypher`).
Backend: the existing Supabase project (`mkyrzikeqpqncgemlsds`).

> **Practice funds only.** No broker, no bank, no real money anywhere.
> No real names or dates of birth. Prices are either real Yahoo Finance
> quotes (Live Desk) or clearly-labelled simulated prices (Trade Floor).

## 0. How to call

```
POST https://<SUPABASE_URL>/rest/v1/rpc/<function_name>
apikey: <ANON_KEY>
Authorization: Bearer <ANON_KEY>
Content-Type: application/json
```

- `<SUPABASE_URL>` and `<ANON_KEY>` are the project's URL and **anon** key.
  They live in `~/workspace/nocturnal-crm/supabase-url.txt` and
  `supabase-anon-key.txt` (0600). **Never use or embed the service key**
  anywhere client-facing — it stays out of the repo entirely.
- Every call is `POST` with a JSON object of the named arguments.
- Success: HTTP 200 with the JSON shown per function below.
- Failure: HTTP 400 with `{"code": "...", "message": "..."}`. The `message`
  is a human-readable reason (e.g. the risk-cap message) — show it to the
  player. Auth failures say `invalid or expired session — please sign in again`.
- Sessions last 30 days; owner sessions last 7 days.
- All money is USD practice dollars, `numeric(14,2)`. All quantities are
  share counts, `numeric(14,4)`.

## 1. Schema

One-paste SQL: [`supabase/schema.sql`](supabase/schema.sql) — run once in the
Supabase Dashboard SQL editor. Tables (all `cypher_` prefixed, RLS enabled
with **deny-all — zero policies**):

| Table | Purpose |
|---|---|
| `cypher_profiles` | `id, username (unique), display_name, tier, pin_hash, created_at` |
| `cypher_sessions` | `token (pk), profile_id, created_at, expires_at` (30 days) |
| `cypher_progress` | `profile_id (pk), level, xp, stars, skills (jsonb), updated_at` |
| `cypher_holdings` | `profile_id, ticker, shares, avg_cost` (pk `profile_id, ticker`) |
| `cypher_wallet_ledger` | `id, profile_id, kind (deposit/withdraw/buy/sell), amount (signed), balance_after, note, created_at` |
| `cypher_orders` | `id, profile_id, desk, ticker, side, order_type, qty, limit_price, stop_price, status (open/filled/cancelled/expired), filled_price, created_at, filled_at` |
| `cypher_events` | `id, profile_id, kind, detail (jsonb), created_at` |
| `cypher_owners` | `id, owner_id (unique), name, access_code_hash` |
| `cypher_owner_sessions` | `token (pk), owner_id, created_at, expires_at` (7 days) |
| `cypher_quotes_cache` | `id (=1, pk), payload (jsonb), fetched_at` |

PINs and owner access codes are stored **only** as bcrypt hashes
(`crypt()` / `gen_salt('bf')` via `pgcrypto`). Plain PINs never hit a table.

## 2. Profiles & sessions

### `createprofile(username, display_name, pin, tier)` → profile

- `username`: 3–20 chars, lowercase letters/numbers/underscore, unique
  (case-insensitive — stored lowercased). `pin`: exactly 4 digits.
- `tier`: `Little Legends` | `Rookie` | `Rookie · Kid Mode` |
  `Teen Trader` | `Adult Trader` (default `Rookie`).
- Welcome practice funds (Nov 21, 2026): a new profile starts with a
  $250 `deposit` ledger row — the full Gateway-0 deposit cap — so Level 1
  is playable immediately. The grant counts toward the lifetime deposit
  cap; `total_deposited` is 250.00 from the start.

```json
// POST {"username":"juice_jr","display_name":"Juice Jr","pin":"1234","tier":"Little Legends"}
{"profile_id":"…","username":"juice_jr","display_name":"Juice Jr","tier":"Little Legends","level":0,"xp":0}
```

### `loginprofile(username, pin)` → session

Wrong username and wrong PIN return the **same** error (`invalid username or PIN`).

```json
// POST {"username":"juice_jr","pin":"1234"}
{"token":"…64-hex…","profile_id":"…","username":"juice_jr","display_name":"Juice Jr","tier":"Little Legends","expires_at":"2026-12-20T15:00:00Z"}
```

### `getsession(token)` → everything the app needs

```json
// POST {"token":"…"}
{
  "profile": {"profile_id":"…","username":"juice_jr","display_name":"Juice Jr","tier":"Little Legends","created_at":"…"},
  "progress": {"level":25,"xp":300,"stars":25,
    "skills": {"market_order":true,"limit_fill":false,"stop_loss":false,"take_profit":false,"diversified":false,"profitable_close":false},
    "discipline_score": 65, "trader_ready": false,
    "gateway": 1, "next_gateway_level": 50,
    "deposit_cap": 500, "max_buy_shares": 10},
  "wallet": {"balance": 450.00, "account_value": 492.50, "total_deposited": 500.00},
  "holdings": [{"ticker":"BOOM","shares":2,"avg_cost":42.10,"current_price":43.05,"simulated":true}],
  "transactions": [{"id":"…","kind":"deposit","amount":250.00,"balance_after":450.00,"note":"practice deposit","created_at":"…"}]
}
```

- `deposit_cap: null` means uncapped (Gateway 8, level 200).
- `transactions`: latest 20 ledger rows, newest first.
- `holdings[].current_price`: live tickers at the cached real price
  (falls back to `avg_cost` when the feed is down), themed tickers at
  today's simulated price.

### `completelevel(token, level)` → progress

Sequential unlock is enforced server-side: `level` must be exactly the
next level (1–200). Replaying a level fails — XP is awarded **once** per
level. XP: **+10 per level, +50 bonus on gateway levels**
(25/50/75/100/125/150/175/200). Stars: +1 per level.

```json
// POST {"token":"…","level":26}
{"level":26,"xp":310,"stars":26,"xp_gain":10,"gateway":1,"trader_ready":false}
```

### `updatetier(token, tier)` → profile

Changes difficulty tier; no progress is lost.

```json
// POST {"token":"…","tier":"Rookie"}
{"profile_id":"…","tier":"Rookie"}
```

### `logevent(token, kind, detail)` → event

Generic log (screen views, lesson events, celebrations). The owner
dashboard groups `detail.screen` as "traffic by screen" — pass
`{"screen":"trade_floor"}` (or the screen name) for page views.

```json
// POST {"token":"…","kind":"screen_view","detail":{"screen":"trade_floor"}}
{"event_id":"…","kind":"screen_view"}
```

## 3. Wallet (practice funds)

### `walletmove(token, kind, amount)` → wallet

`kind`: `deposit` (adds) or `withdraw` (removes). `amount` > 0.
Every move writes a ledger row with the balance after the move.

```json
// POST {"token":"…","kind":"deposit","amount":250}
{"kind":"deposit","amount":250.00,"balance":450.00,"account_value":492.50}
```

#### Deposit-cap table (cumulative lifetime deposits, by gateway)

| Gateway | Levels | Total-deposit cap |
|---|---|---|
| G0 | 0–24 | $250 |
| G1 | 25–49 | $500 |
| G2 | 50–74 | $1,000 |
| G3 | 75–99 | $2,500 |
| G4 | 100–124 | $5,000 |
| G5 | 125–149 | $10,000 |
| G6 | 150–174 | $25,000 |
| G7 | 175–199 | $50,000 |
| G8 | 200 | uncapped |

Withdrawals do **not** restore headroom — cycling money in and out cannot
raise the cap. A deposit that would exceed the cap is rejected with the
cap, the amount already deposited, and the next gateway level.

## 4. Trade Floor — simulated (`papertrade`)

### `getprices()` → simulated feed (no auth)

**Chosen implementation: RPC-computed deterministic seeded walk.**
`getprices()` computes prices in Postgres from `(ticker + date)` — a
hash-seeded daily walk of at most ±3%/day from a fixed base price, pulled
2%/day back toward base so it stays bounded. Same ticker + same date ⇒
same price. The frontend never computes prices itself.

Every response carries `"simulated": true` and the label
`"SIMULATED PRACTICE — these prices are made up for learning, not real market data"`.
The UI must show that label wherever Trade Floor prices appear.

```json
// POST {}
{
  "asOf": "2026-11-20",
  "simulated": true,
  "label": "SIMULATED PRACTICE — these prices are made up for learning, not real market data",
  "tickers": {
    "BOOM": {"name":"BoomBox Audio Co.","price":42.10,"prevClose":41.55,"changePct":1.32,
             "candles":[[1795000000000,41.00,42.50,40.80,42.10,512000], "... 30 daily candles ..."]}
  }
}
```

- 16 themed tickers (the game's own companies): `BOOM, BEAT, GOLD, VINYL,
  FLOW, MIC, HUSTLE, EMPIRE, LEGACY, CYPHER, BASS, TEMPO, CROWN, STUDIO,
  BLOCK, TURNTBL`.
- Prices change **once a day**, not tick-by-tick. Candles are 30 daily
  bars `[t_ms, open, high, low, close, volume]`; high/low are a ±0.5%
  band around open/close (this feed is a daily practice walk, not real
  ticks) and volume is a deterministic pseudo-random 100k–999k.

### `papertrade(token, ticker, side, qty, price)` → trade

Immediate fill at the **server-computed** simulated price. The client
passes the price it saw from `getprices()`; the server rejects the trade
if that price is more than 5% off the server price (stale/spoofed feed).

- Themed tickers only. Max **10 shares per trade**. Same 2% risk rule
  (no-stop form — see §6). Sells require holding the shares.

```json
// POST {"token":"…","ticker":"BOOM","side":"buy","qty":2,"price":42.10}
{"ticker":"BOOM","side":"buy","qty":2,"price":42.10,"balance":365.80,"shares_held":2,"desk":"trade_floor","simulated":true}
```

## 5. Live Desk — real tickers (`placeorder`)

Real tickers only: `AAPL, MSFT, NVDA, AMZN, TSLA, META, GOOGL, AMD`.
**Locked until Gateway 1 (level 25).**

### Pricing — read this before building the client

`placeorder` takes **no price argument**, so the server prices every
order from the cached real quotes (`cypher_quotes_cache`). The price the
client saw in `quotes.json` is **never trusted** for validation — the
server is the authority. If the cache is empty, market orders fail with
`live feed unavailable` instead of trading on a guess. (The original
brief said "validation uses the price the client passes" — that cannot
hold with this signature, so the server-side cache is the rule.)

### `placeorder(token, ticker, side, order_type, qty, limit_price, stop_price)` → order

| `order_type` | Meaning | Required | Fills when |
|---|---|---|---|
| `market` | Fill now at the cached price | — | Immediately |
| `limit` | Buy low / sell high | `limit_price` | buy: price ≤ `limit_price`; sell: price ≥ `limit_price` |
| `stop` | Buy on breakout / sell on breakdown | `stop_price` | buy: price ≥ `stop_price`; sell: price ≤ `stop_price` |
| `take_profit` | Sell only — lock in a gain | `limit_price` (the trigger) | price ≥ `limit_price` |

```json
// POST {"token":"…","ticker":"AAPL","side":"buy","order_type":"market","qty":1,"limit_price":null,"stop_price":245.00}
{"order_id":"…","ticker":"AAPL","side":"buy","order_type":"market","qty":1,"status":"filled","filled_price":250.00,"balance":700.00}

// POST {"token":"…","ticker":"MSFT","side":"buy","order_type":"limit","qty":1,"limit_price":390.00,"stop_price":null}
{"order_id":"…","ticker":"MSFT","side":"buy","order_type":"limit","qty":1,"status":"open","limit_price":390.00,"stop_price":null,"filled_price":null,"balance":700.00}
```

- **Max buy size per order, by gateway:** G1 10, G2 15, G3 20, G4 30,
  G5 50, G6 75, G7 100, G8 200 shares. (G0: desk locked.) Sells are
  capped only by shares held — you can always exit.
- **Fills:** market orders fill immediately at the cached price.
  Limit/stop/take-profit orders sit `open` and are evaluated **lazily**
  against the latest cache on every `getliveprices()` / `placeorder()` /
  `cypher_cache_quotes()` call. A pending order whose trigger is already
  touched fills immediately at placement. Fills happen at the **current
  cached price**, not the trigger price. An order that can no longer be
  afforded (buy) or covered (sell) at fill time **expires** instead of
  driving the balance negative.
- A `stop_price` may be carried on a market/limit/take-profit order too —
  it acts as the protective stop-loss for the risk check (§6) and earns
  the stop-loss skill (§7).
- Funds/shares are checked at placement **and** re-checked at fill time.

### `cancelorder(token, order_id)` → order

Only `open` orders can be cancelled.

```json
// POST {"token":"…","order_id":"…"}
{"order_id":"…","status":"cancelled"}
```

### `getorders(token)` → orders (open first, then recent)

Lists the player's orders — open orders first, then the most recent
filled / cancelled / expired ones (limit 20). The Live Desk calls this
on load so open orders survive a reload; orders placed in the current
session are also kept in the local list.

```json
// POST {"token":"…"}
[
  {"order_id":"…","desk":"live","ticker":"AAPL","side":"sell","order_type":"take_profit",
   "qty":1,"limit_price":300.00,"stop_price":null,"status":"open",
   "filled_price":null,"created_at":"…","filled_at":null}
]
```

### `getliveprices()` → real feed + feed state (no auth)

Calling this also lazily evaluates pending Live Desk fills for **all**
players against the latest cache.

```json
// POST {}
{
  "simulated": false,
  "label": "REAL MARKET DATA — Yahoo Finance, via the quotes Action",
  "feedState": "live",
  "asOf": "2026-11-20T15:00:00.000Z",
  "fetchedAt": "2026-11-20T15:00:05.123456Z",
  "marketState": "REGULAR",
  "tickers": {
    "AAPL": {"price":348.70,"prevClose":349.21,"open":352.63,"high":354.30,"low":348.29,"changePct":-0.15,
             "candles":[[1795185000000,352.63,354.30,348.29,348.70,13533674], "... 60 daily candles ..."]}
  },
  "note": "Market is open and quotes are fresh (under 15 minutes old)."
}
```

#### Feed-state rules (`feedState`)

Derived server-side from the New York clock and the age of the cached
`asOf` (the Action refreshes every 10 min in market hours):

| `feedState` | Condition |
|---|---|
| `live` | Market open (Mon–Fri 09:30–16:00 ET) and `asOf` ≤ 15 min old |
| `delayed` | Market open and `asOf` 15–30 min old |
| `market_closed` | Outside market hours (weekend / before 09:30 / after 16:00 ET) — prices shown are the last close |
| `feed_unreachable` | No cache at all, or market open and `asOf` > 30 min old |

The UI must show the state and the as-of time next to Live Desk prices,
and `feed_unreachable` must pause Live Desk trading (the server already
rejects market orders with no cache).

### `cypher_cache_quotes(payload)` → cache status (no auth)

The frontend fetches `data/quotes.json` same-origin and POSTs its
contents here to refresh the server cache. Payload shape is exactly the
`data/quotes.json` shape (see §8).

```json
// POST {"asOf":"2026-11-20T15:00:00.000Z","marketState":"REGULAR","tickers":{…8 tickers…}}
{"ok":true,"asOf":"2026-11-20T15:00:00.000Z","tickers":8,"feedState":"live"}
```

Guards: payload must carry `asOf` + all 8 live tickers with prices > 0;
`asOf` must be **newer** than the cached `asOf` and not > 15 min in the
future; no single ticker may move **> 20%** vs the previous cache (a bad
file or a wild print is rejected and the cache is left untouched). On
success, pending fills are evaluated against the new prices.

> **Honest limit:** this endpoint takes no token (its signature is fixed
> as `cypher_cache_quotes(payload)`), so anyone with the anon key can call
> it — the sanity band above is the only guard. If that is ever abused,
> add an ingest secret: a `cypher_ingest_secret` table holding one bcrypt
> hash, a second `token` argument, and a check in the function. That is a
> deliberate future hardening step, not built today.

## 6. The 2%-of-account risk cap (one rule, enforced server-side)

Applies to **every** `papertrade` and `placeorder` at placement time.
`account_value` = cash balance + market value of all holdings (live
holdings at the cached real price, themed holdings at the simulated
price; falls back to `avg_cost` when a price is unavailable).

- **With a stop:** `risk = qty × |entry price − stop price|`
- **No stop:** `risk = qty × entry price × 0.02` (a 2% adverse move)
- **Rule:** `risk ≤ 2% of account value`, or the trade is rejected with
  the dollar amounts in the error message.

Notes:

- For a no-stop order this simplifies to "position size ≤ account
  value" — without a stop you may not bet the house.
- For a `stop` order, the `stop_price` **is** the entry trigger, so it is
  not also counted as the protective stop (that would price risk at $0);
  stop orders use the no-stop form with the trigger as the entry price.
- For market/limit/take-profit orders carrying a `stop_price`, the entry
  price is the cached price (market) or the `limit_price` (limit /
  take-profit), and the stop is the protective stop in the formula.
- `account_value ≤ $0` cannot trade at all — add practice funds first.

## 7. Discipline score & Trader Ready

### Discipline score (0–100, computed live from the player's record)

| Component | Points |
|---|---|
| Start | 50 |
| Per skill earned (max 6) | +5 each (max +30) |
| At least half of filled buys carried a stop (min. 2 filled buys) | +10 |
| At least 3 filled buys and most carried **no** stop | −10 |
| More than 5 cancelled orders | −5 |
| **Clamped** | **0–100** |

Returned as `progress.discipline_score` in `getsession()`.

### Trader Ready — the six skills (fixed list)

`progress.trader_ready` is true only when **level 200 is complete AND**
all six skills are earned. Skills live in `progress.skills`:

1. `market_order` — place a market order (Live Desk or Trade Floor).
2. `limit_fill` — place a limit order **that fills**.
3. `stop_loss` — place an order carrying a `stop_price`.
4. `take_profit` — place a take-profit order.
5. `diversified` — hold positions in **3+ different tickers at once**.
6. `profitable_close` — close a trade at a profit (sell price > avg cost).

## 8. Quotes file & GitHub Action

- Script: [`scripts/fetch-quotes.mjs`](scripts/fetch-quotes.mjs)
  (dependency-free Node 20+, global `fetch` only).
- Workflow: [`.github/workflows/quotes.yml`](.github/workflows/quotes.yml)
  — every 10 min `13:00–21:59 UTC Mon–Fri` (covers 09:30–16:00 ET in both
  EST and EDT), a daily pre-market run `12:05 UTC Mon–Fri`, plus
  `workflow_dispatch`. Commits `data/quotes.json` via `GITHUB_TOKEN`.
  No secrets needed; Yahoo Finance needs no key.
- Source: Yahoo Finance chart API
  `v8/finance/chart/{T}?range=3mo&interval=1d` (Stooq was tested and
  **rejected** — 404/bot-check — do not use it). Per-ticker failure reuses
  that ticker's previous entry; the run only fails when a ticker has
  neither fresh nor previous data.
- `data/quotes.json` shape:
  `{asOf (ISO-8601 UTC), marketState ("REGULAR"|"CLOSED" from the NY clock), tickers:{SYM:{price, prevClose, open, high, low, changePct, candles:[[t_ms,o,h,l,c,v], …60 daily…]}}}`
  `prevClose` is the previous trading day's close (the second-to-last
  candle — Yahoo's `chartPreviousClose` is the close *before the 3-month
  range* and must not be used).
- **First run:** after creating the repo, trigger `workflow_dispatch`
  once so `data/quotes.json` exists before launch.

## 9. Owner (Tye's Owners Portal)

### `ownerstatus()` → whether an owner exists (no auth)

```json
// POST {}
{"owner_exists": false}
```

### `setupowner(name, owner_id, access_code)` → owner

Creates the **single** owner account; a second call fails. Access code:
min. 6 characters, stored only as a bcrypt hash. Run once with the real
owner id + code — there is no reset path in the app (the SQL file's
verification section documents the emergency dashboard reset).

```json
// POST {"name":"Tye","owner_id":"tye","access_code":"…"}
{"owner_id":"tye","name":"Tye"}
```

### `loginowner(owner_id, access_code)` → owner session (7 days)

```json
// POST {"owner_id":"tye","access_code":"…"}
{"token":"…","owner_id":"tye","name":"Tye","expires_at":"2026-11-27T15:00:00Z"}
```

### `getownerdashboard(owner_token)` → dashboard

```json
// POST {"owner_token":"…"}
{
  "totals": {"players":12,"trader_ready":1,"levels_completed":640,"total_xp":6900,
             "total_deposited":5400.00,"total_withdrawn":200.00,"total_practice_cash":5100.00,
             "live_orders":48,"live_orders_filled":31,"trade_floor_trades":210,"events_total":1204},
  "traffic_by_screen": [{"screen":"trade_floor","events":320},{"screen":"live_desk","events":180}],
  "events_by_kind": [{"kind":"trade","events":241},{"kind":"level_complete","events":640}],
  "roster": [{"username":"juice_jr","display_name":"Juice Jr","tier":"Little Legends","level":25,"xp":300,"weekly_xp":60,"weekly_levels":6,"stars":25,
              "balance":450.00,"account_value":492.50,"discipline_score":65,"trader_ready":false,
              "joined":"…","last_active":"…"}],
  "leaderboard": [{"username":"juice_jr","display_name":"Juice Jr","tier":"Little Legends","level":25,"xp":300,"weekly_xp":60,"weekly_levels":6}],
  "activity": [{"username":"juice_jr","kind":"gateway_unlocked","detail":{"level":25,"gateway":1,"note":"Gateway 1 cleared — the Live Desk is now open. Real market prices, $500 practice cap."},"created_at":"…"},{"username":"juice_jr","kind":"trade","detail":{"desk":"live","ticker":"AAPL","side":"buy","qty":1,"price":250.00,"simulated":false},"created_at":"…"}]
}
```

**Family leaderboard** (`leaderboard`, new Nov 20, 2026): ranked by XP earned
in the last 7 days (`weekly_xp` desc, then `weekly_levels`, level, XP) —
not by total XP, so every week starts fresh. Computed from the server-side
`level_complete` events (which carry `xp_gain`); the frontend's own
`level_complete` screen event has no `xp_gain` and never counts. The same
`weekly_xp` / `weekly_levels` fields also ride on each `roster` row.
**Gateway notes:** every `gateway_unlocked` event now carries a plain-words
`detail.note` (Gateway 1 names the Live Desk opening + $500 cap) so the
Owners Portal activity feed reads as a note, not just an event kind.

No PINs, hashes, or session tokens are ever returned. `traffic_by_screen`
groups `cypher_events.detail.screen` (events without a screen count under
`"(no screen)"`).

## 10. What is enforced server-side vs what comes from the feed file

| Rule | Where it is enforced |
|---|---|
| Sequential level unlock, XP once per level | `completelevel()` RPC |
| Deposit caps, max buy size, Live Desk gateway lock | `walletmove()` / `placeorder()` RPCs |
| 2% risk cap | `_cypher_check_risk()` inside `papertrade()` / `placeorder()` |
| Funds / shares checks (placement + fill) | `_cypher_execute_trade()` + `placeorder()` |
| Limit/stop/take-profit fills | `_cypher_evaluate_fills()` (lazy, on `getliveprices` / `placeorder` / `cypher_cache_quotes`) |
| Discipline score, Trader Ready, skills | Computed from ledger/orders/progress in the RPCs |
| Auth (sessions, PINs, owner code) | `loginprofile()` / `loginowner()` + `_cypher_auth()` |
| **Real prices** | **NOT computed server-side.** Yahoo → Action → `data/quotes.json` (same-origin file) → frontend → `cypher_cache_quotes()` → `cypher_quotes_cache`. The server only validates the payload (freshness + 20% band) and derives `feedState`. If the Action stops, the cache goes stale and `feedState` degrades to `feed_unreachable` — trading does not silently continue on old prices. |
| **Simulated prices** | Computed **server-side** in `getprices()` / `_cypher_sim_price()` — the client never invents a price. `papertrade()` re-computes and tolerance-checks it. |
| Order entry price | Server-side, from the quotes cache (`placeorder` takes no price argument). The client's copy of the price is display-only. |

## 11. Applying the schema

1. In the Supabase Dashboard (project `mkyrzikeqpqncgemlsds`), open the
   SQL Editor, paste [`supabase/schema.sql`](supabase/schema.sql) whole,
   run once. It is idempotent (tables `IF NOT EXISTS`, functions
   `CREATE OR REPLACE`) — safe to re-run.
2. Run the commented verification queries at the end of the file
   (owner check, test profile, hand-made quote payload, owner flow).
3. In the repo, trigger the quotes workflow once (`workflow_dispatch`).
4. In the app, call `ownerstatus()` → `setupowner()` once for Tye,
   then `loginowner()` → `getownerdashboard()`.

## 12. Open items / known limits

- `cypher_cache_quotes` is unauthenticated by design of its signature —
  see the hardening note in §5. The 20% sanity band + freshness check is
  the current guard.
- The simulated feed's high/low are a ±0.5% band, not real ticks, and
  prices move daily, not intraday — label it as practice everywhere.
- `hashtext()` (the sim-feed seed) is stable within one Postgres
  deployment; if the project ever migrates to a new Postgres major
  version, simulated prices may shift — the frontend always asks
  `getprices()`, so nothing breaks, prices just re-seed.
- No real-money rails exist or are planned in this backend. Any future
  broker integration is a separate build, not an extension of these RPCs.

## 13. Email recovery — self-serve PIN reset (added Nov 21, 2026)

Rashad: "Account recovery should via email." Players are NOT Supabase
Auth users (custom username + 4-digit PIN), so Supabase Auth's built-in
reset email does not apply. Recovery email is **optional at signup**
(the game promises "no real names, no birthdays" and never asks for an
email to play) and is stored on the profile only for sending reset
links — never shared, never used for anything else. The owner-assisted
reset below stays as the fallback, so nobody is ever locked out.

**Send route:** Resend, called from inside `requestpinreset()` via
`pg_net` (`net.http_post`) — no Edge Function, no new deploy surface.
Setup (one-time, before the migration): Resend account → verify
`wallstcypher.com` as a sending domain (DNS records at Spaceship) →
create an API key → insert it into `cypher_settings` (key
`resend_api_key`, plus `resend_from`). If the key is not configured,
`requestpinreset()` raises "email reset is not set up yet — ask the
owner to reset your PIN from the Owners Portal" and the player is
pointed at the owner fallback instead of waiting on an email that
never comes.

**Tokens:** 32 random bytes, hex-encoded; only the SHA-256 hash is
stored. Single-use, 1-hour expiry, one active token per player; while
a live token exists no second email is sent (the player uses the link
already sent). Reset link: `https://wallstcypher.com/?reset=<token>`. A successful
token reset deletes ALL of the player's sessions and logs the event
via `'email'` (vs `'owner'` for the owner reset).

**No enumeration:** `requestpinreset()` returns `{"ok": true}` for an
unknown username or a profile with no email on file, and writes
nothing — the frontend shows the same "check your inbox" message
either way.

### `requestpinreset(username)` → `{ok}` (no auth)

```json
// POST {"p_username":"juice_jr"}
{"ok": true}
```

### `resetpinwithtoken(token, new_pin)` → `{pin_reset, username}` (no auth)

```json
// POST {"p_token":"…","p_new_pin":"4321"}
{"pin_reset": true, "username": "juice_jr"}
```
Fails on an unknown, expired, or already-used token ("This reset link
has expired or was already used — ask for a new one").

### `setrecoveryemail(token, email)` → `{recovery_email_set}` (player session)

Called after sign-in (or right after signup, with the fresh session
token). Also marks the player as prompted, so the post-sign-in ask
never appears again. Clears `recovery_email` when passed an empty
string.

```json
// POST {"p_token":"…","p_email":"parent@example.com"}
{"recovery_email_set": true}
```

### `dismissrecoveryprompt(token)` → `{recovery_prompted}` (player session)

Records that the player tapped "Not now" on the post-sign-in ask —
the ask never appears again for that player (they can still add an
email any time from the start screen's "📧 Recovery email" button).

```json
// POST {"p_token":"…"}
{"ok": true}
```

### Owner reset — the fallback (built Nov 21, 2026, unchanged)

### `resetplayerpin(owner_token, username, new_pin)` → `{pin_reset, username}`

```json
// POST {"p_owner_token":"…","p_username":"juice_jr","p_new_pin":"4321"}
{"pin_reset": true, "username": "juice_jr"}
```
Same session-invalidation and event logging as the token reset, with
`via: 'owner'`. Panel: Owners Portal → "Reset a player's PIN".

### `getsession(token)` — new profile fields (additive, no signature change)

```json
"profile": {
  "profile_id": "…", "username": "juice_jr", "display_name": "Juice Jr",
  "tier": "Little Legends", "created_at": "…",
  "recovery_email_set": false,
  "recovery_prompted": false
}
```
The frontend uses these to show the post-sign-in recovery-email ask
exactly once, only on fresh sign-in / sign-up / session restore —
never mid-game.

**Applying it:** the delta is
[`supabase/email-recovery-migration.sql`](supabase/email-recovery-migration.sql)
— paste it whole into the SQL editor (it is the same code as the
email-recovery section of `schema.sql`, plus the `getsession` update).
Run the verification queries at the end of that file (no-enumeration
check + full loop on a throwaway profile). Then deploy the frontend.
