# Wall St. Cypher — Levels

`data/levels.json` holds all 200 levels of the standalone rebuild. Every lesson
and history card is lifted **verbatim** from the exported static game
(`~/workspace/your_files/stock-trading-game/stock-trading-game.html`); no
lesson or history text was rewritten and no new historical claims were added.
No player names or dates of birth appear anywhere. All money is practice
funds — no real-money language, no prices in level copy.

## Source

Composition follows the static game's own functions — `lessonFor(n)`,
`levelName(n)`, `startLevel(n)`, `endLevel(won)` — read from the export.
The build script (`build_levels.js`) calls the static game's `lessonFor()`
directly and replicates `startLevel()`'s seeded math, so the JSON matches
what the static game shows a default (Rookie) player.

Content banks in the export:

| Bank | Size | Role |
| --- | --- | --- |
| CORE | 25 lessons | One per level, levels 1–25 |
| ADVANCED | 12 lessons | Cycled, levels 26–200 |
| HISTORY | 46 cards | Cycled across all 200 levels |
| COMPANIES | 16 themed tickers | One per level (seeded pick) |
| PATTERNS | 8 chart patterns | Gameplay flavor, not stored here |
| BOSSES | 5 characters | Every 5th level |
| NEWS_UP / NEWS_DOWN / NEWS_FLAT | 4 / 4 / 3 lines | Gameplay flavor, not stored here |

## How the 200 levels are composed

**Acts** (from `ACTS` in the export — renamed in `app.js` to the eras of
hip-hop, beginning to end; the numeric act boundaries are unchanged):

- **Act I — The Beginning:** levels 1–25. The Bronx, 1973 — where it all started. Clearing 25 opens Act II.
- **Act II — The Golden Age:** levels 26–100. The 80s and 90s — the rise, the legends, the sound spreading. Clearing 100 opens Act III.
- **Act III — The Modern Era:** levels 101–200. The 2000s to today — hip-hop as the biggest culture on the planet. Clearing 200 completes the cypher.

**Lessons** — `lessonFor(n)`:

- Levels 1–25: `CORE[n-1]` — each of the 25 core lessons appears exactly once.
- Levels 26–200: `ADVANCED[(n-26) % 12]`, with the body suffixed
  `(Mastery round C: the same idea, a harder chart, a bigger target — pros
  revisit fundamentals at higher stakes.)` where
  `C = floor((n-26)/12) + 1`. That is 14 full cycles (levels 26–193,
  rounds 1–14) plus a 15th round covering levels 194–200
  (`ADVANCED[0]`–`ADVANCED[6]`). Each advanced lesson therefore appears
  14 or 15 times. The 37 distinct lesson titles are the only titles in the
  file; repetition is the static game's own design (mastery rounds), not a
  gap in the data.

**History cards** — `HISTORY[(n-1) % 46]`, one true story per level. 46
cards across 200 levels means 4 full cycles (184 levels) plus 16: cards
1–16 appear 5 times each, cards 17–46 appear 4 times each. The bank spans
the full timeline — Black American history from 1865 to today, and the
hip-hop arc from its birth to the present. Five cards added Nov 20, 2026
to complete the hip-hop arc (Rashad's "beginning to end" direction):
DJ Kool Herc — The Birth of Hip Hop (1973); Grandmaster Flash — The
Turntable Becomes an Instrument; Public Enemy & N.W.A. — The Golden Age
Finds Its Voice; Outkast & the South — Hip Hop Goes Nationwide; Kendrick
Lamar — The Pulitzer (2018). They sit just before the closing card ("The
Next Chapter Is Yours"), which stays last. The new cards land on levels
41–45, 87–91, 133–137, and 179–183 — one consecutive run per cycle, in
every act. The build/validator slice of the extract is lines 0–131
(126 before the bank grew); both read the same slice, so the rebuild and
the validation stay in lockstep.

**Bosses** — every multiple of 5 (`n % 5 === 0`), 40 boss levels total.
The static game cycles the five bosses in order,
`BOSSES[(floor(n/5)-1) % 5]`: Baron Von Bear → Madame Short-Sell →
Kangol Kenny → The Hype Man → Gold Chain G → repeat. One deliberate
deviation from the static game: its cycle puts **Gold Chain G at every
gateway**, but the rebuild spec requires the gateways to alternate
Kangol Kenny and Gold Chain G, so the eight gateway levels are:

| Gateway | Boss |
| --- | --- |
| 25, 75, 125, 175 | Gold Chain G |
| 50, 100, 150, 200 | Kangol Kenny |

All other boss levels follow the static cycle unchanged. Final boss
counts: Kangol Kenny 12, Gold Chain G 4, Baron Von Bear 8,
Madame Short-Sell 8, The Hype Man 8. Boss levels also carry a +6%
target bump (see below).

**Titles** — `title` is the display title: the static game's level header
strips a leading `BOSS: ` from the lesson title. The five Act I boss
lessons are titled `BOSS: First Gate`, `BOSS: Chart Reader`,
`BOSS: The Valuation Battle`, `BOSS: Portfolio Manager`,
`BOSS: The Come-Up Final` in CORE and appear here as `First Gate`,
`Chart Reader`, `The Valuation Battle`, `Portfolio Manager`,
`The Come-Up Final`. In Acts II–III a boss level carries the current
ADVANCED lesson title (the static UI prefixes it with 👑 BOSS —).

**Ticker** — themed tickers only, from COMPANIES (BOOM, BEAT, GOLD,
VINYL, FLOW, MIC, HUSTLE, EMPIRE, LEGACY, CYPHER, BASS, TEMPO, CROWN,
STUDIO, BLOCK, TURNTBL). The pick replicates `startLevel()`'s seeded
random draw for the default Rookie profile — seed `n*7919+3`, first draw
picks the company — so each level's ticker is deterministic and matches
what the static game shows. The 8 real tickers (AAPL, MSFT, NVDA, AMZN,
TSLA, META, GOOGL, AMD) are Live Desk only and never appear in levels.

**Target** — the Rookie, non-kid dollar target from `startLevel()`,
practice funds: starting cash `1000 + min(4000, n*20)`, target percent
`0.06 + n*0.0016 + tier*0.03 + (boss ? 0.06 : 0)` where
`tier = floor((n-1)/25)`, target `= round(cash * (1 + pct))`. It runs
from $1,083 at level 1 to $8,250 at level 200. In live play the target
varies by profile (difficulty bonus, kid/little flat $1,000 cash); the
JSON pins the Rookie default so the data file is stable.

**Not stored here** (recomputed at runtime by the game, as in the static
version): chart pattern (second seeded draw), starting price, trading
days, news line, coach line. Scoring, from `endLevel()`: stars by finish
vs. target (≥112% → 3, ≥104% → 2, else 1); XP on first clear =
`stars*10 + n + (boss ? 40 : 0)`.

## Entry shape

Each entry: `n` (1–200), `act` (1/2/3), `title`, `lesson`, `takeaway`,
`historyTitle`, `historyBody`, `historyTakeaway`, `ticker`, `tickerName`,
`target`, `boss` (boss name, or `null` on non-boss levels).

## Trader Ready

Trader Ready is the certification a player earns by completing **all 200
levels AND all six skills** below. The skill list is fixed — do not change
it:

1. Place a market order
2. Place a limit order that fills
3. Set a stop-loss
4. Set a take-profit
5. Hold positions in 3+ different tickers at once
6. Close a trade at a profit

Skills are tracked live in play (order types and positions), not stored in
`levels.json` — the level data is the content; Trader Ready is content
plus demonstrated trading behavior.

## Validation

`node validate_levels.js` (exit 0 = pass). It asserts: 200 entries with
sequential `n` 1–200; acts 1–25 / 26–100 / 101–200; bosses exactly at
multiples of 5 (40) with the gateway alternation above; every field
present and non-empty on every entry; every lesson/history string identical
to the static game's `lessonFor()` output; every ticker a themed COMPANIES
ticker (no real tickers); every ticker/target matching the static seeded
math. Last run: **passed, 0 failures**.

## Notes / gaps

- `/tmp/static-game.js` was gone on arrival (the VM clears `/tmp` on
  restart). The script was re-extracted verbatim from the exported HTML
  and kept at `static-game-extract.js` in this directory as the build
  source; the build and validator both read from it.
- The banks are smaller than 200 by design (37 lessons, 46 history cards).
  Coverage uses the static game's own cycling (mastery rounds for lessons,
  straight modulo for history) — the five Nov 20 history cards are the only
  additions to the bank, all verifiable facts, each tied to its year.
- The gateway-boss alternation (above) is the only place the JSON
  deviates from the static game's own boss cycle, per the rebuild spec.
