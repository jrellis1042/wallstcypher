# Wall St. Cypher — Standalone (wallstcypher.com)

A stock trading game for kids and adults. Learn to trade for real:
200 levels, real stocks, real data, practice funds only. A gift for
Rashad's mom, Tye.

## Architecture ($0 — free tiers only)

- **Frontend:** static single-page app (`index.html`, `app.js`, `api.js`,
  `styles.css`, `config.js`) — hosted on GitHub Pages from the public
  repo `jrellis1042/wallstcypher`. Later, `wallstcypher.com` points at
  the same repo via Pages custom-domain.
- **Backend:** Supabase project `mkyrzikeqpqncgemlsds` (the existing
  Nocturnal project). All data access is through `SECURITY DEFINER`
  RPCs in `supabase/schema.sql` (tables `cypher_*`, RLS deny-all).
  No server of our own to run.
- **Real quotes:** GitHub Actions (`.github/workflows/quotes.yml`)
  fetches Yahoo Finance every 10 min in market hours and commits
  `data/quotes.json`. The frontend reads it same-origin and pushes it
  to the server cache (`cypher_cache_quotes`) so the server prices
  Live Desk orders from real data. Stooq was tested and rejected
  (404/bot-check) — do not use it.
- **Trade Floor feed:** simulated, deterministic, computed in Postgres
  (`getprices()`), always labelled SIMULATED PRACTICE.

## The game (matches the Muse real version)

- Front door: username + 4-digit game PIN + tier (incl. Little Legends,
  ages 4–7). Start screen "YOU'RE IN, {name}!" + progress chips + big
  START GAME button.
- 200 levels / 3 acts (1–25 / 26–100 / 101–200), boss every 5th level,
  gateways at 25/50/75/100/125/150/175/200. Level content in
  `data/levels.json` (validated; lessons + history cards verbatim
  from the original game, plus 5 hip-hop history cards added Nov 20,
  2026 — Herc, Flash, Public Enemy & N.W.A., Outkast, Kendrick).
  Acts are the eras of hip-hop, beginning to end: Act I The Beginning
  (Bronx, 1973), Act II The Golden Age (80s–90s), Act III The Modern
  Era (2000s–today). Graffiti styling (Rubik Spray Paint) runs through
  headers, level cards, act transitions, and the ceremony as the visual
  thread. Black history stays front and center: every level card carries
  a history story, the Owners Portal has a weekly Black History
  Spotlight, and the level-25 ceremony carries that level's story.
- Live Desk (locked until level 25): AAPL, MSFT, NVDA, AMZN, TSLA,
  META, GOOGL, AMD. Market / limit / stop-loss / take-profit orders,
  2%-of-account risk cap, discipline score 0–100, 60 real daily
  candles per ticker, honest feed states (live / delayed /
  market closed / feed unreachable — never simulated-as-real).
- Wallet: practice funds only, with ledger. Caps: $250 before
  Gateway 1, then $500 / $1,000 / $2,500 / $5,000 / $10,000 /
  $25,000 / $50,000, uncapped at level 200.
- Trader Ready: all 200 levels + six skills (market order, filled
  limit order, stop-loss, take-profit, hold 3+ tickers, close at a
  profit). Awards tab: 15 achievements + Gateway Road.
- Stock of the Week (new Nov 20, 2026): on the Trade Floor, one of the 8
  live tickers is spotlighted each week with a kid-friendly story about
  the company (what it makes, why it matters in everyday life), written
  for ages 4–7 and up. Rotation is deterministic by week number (weeks
  count from Mon Jan 5, 2026, UTC), so every player sees the same pick.
  The price comes from the Yahoo quotes feed via `getliveprices()`; if
  the feed is down the story still shows and no price is shown rather
  than a fake one. History ties appear only where natural (Apple →
  Greenwood ownership; Amazon → Madam C.J. Walker). A story, not a tip.
- Family leaderboard (new Nov 20, 2026): in the Owners Portal, weekly
  standings across the family's player profiles, ranked by XP earned in
  the last 7 days (not total XP). No new table — computed in
  `getownerdashboard()` from the server-side `level_complete` events.
  The roster table also carries "XP this week" / "Levels this week"
  columns, and the roster CSV export includes them.
- Gateway 1 ceremony (new Nov 20, 2026): completing level 25 opens a
  certificate-style celebration (player's stage name, date, $500
  practice cap) with an "Enter the Live Desk →" button, instead of the
  quiet level-complete modal. The server also writes a plain-words note
  on the `gateway_unlocked` event, so the Owners Portal activity feed
  shows "Gateway 1 cleared — the Live Desk is now open…" The gateway
  lock, sequential levels, and XP-once rules are untouched.
- Owners Portal: own login (Owner ID + access code), dashboard,
  player roster, live activity feed, CSV export.

## Gift packaging

Front door + start screen carry "A Gift for Tye" with the dedication
"Made for Mom, with love — from Rashad", plus a gift note in the
Owners Portal. The game underneath is unchanged.

## Deploy (in order)

1. Create public repo `jrellis1042/wallstcypher`, push this directory
   to `main`.
2. GitHub repo → Settings → Pages → Deploy from branch `main`, `/`
   (root). Test URL: `https://jrellis1042.github.io/wallstcypher/`
3. Supabase dashboard → SQL editor → paste `supabase/schema.sql` →
   Run. Then run the commented verification queries at the end of
   the file. (Needs real `pgcrypto` — Supabase ships it; the local
   test stubbed it.)
4. GitHub repo → Actions → `quotes.yml` → Run workflow once
   (workflow_dispatch); it then runs on schedule.
5. Set up the owner once: open the live Owners Portal → first-time
   setup (Owner ID `tye`, access code of Rashad's choosing).
6. When `wallstcypher.com` is bought: repo → Settings → Pages →
   Custom domain `wallstcypher.com`, then the DNS CNAME GitHub shows.

## Verify live (after deploy)

- `ownerstatus()` → create a test parent profile + a kid profile
  (Little Legends) → `getsession` → complete level 1 → check the
  level-1 gateway lock (Live Desk locked) → after level 25, check a
  live quote + place a real order → Owners Portal roster + CSV.
  New Nov 20: Trade Floor shows Stock of the Week (this week: META);
  Owners Portal leaderboard ranks by weekly XP; completing level 25
  shows the Gateway 1 ceremony and the gateway note in the portal feed.
- Local smoke test: `python3 -m http.server` in this directory;
  all files return 200. `node validate_levels.js` (200 levels).
  `node --check` on all JS. Full backend suite:
  `/tmp/test_schema2.py` (69 asserts, local Postgres).

## Known limitations (honest)

- `cypher_cache_quotes` is unauthenticated by design; guarded by
  freshness + a 20% per-ticker sanity band. Future hardening: an
  ingest secret in the Action.
- `placeorder` is priced server-side from the quotes cache (no
  client-passed price) — strictly stronger than the original spec.
- Trade Floor `papertrade` takes no stop price; the UI notes this
  and points players to the Live Desk for the stop-loss skill.
- Level Complete requires a practice trade in the level (UI gate);
  sequential unlock + XP-once are server-enforced.
- Saved data starts fresh on this version (the Muse version's
  profiles do not carry over).
- The anon key ships in `config.js` by design (Supabase public
  client key). The service key is never in this repo.
