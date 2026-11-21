// fetch-quotes.mjs — Wall St. Cypher live-quotes fetcher (dependency-free).
//
// Fetches the Yahoo Finance chart API (free, no key) for the 8 real Live
// Desk tickers and writes data/quotes.json, which the frontend reads
// same-origin and pushes into Supabase via the cypher_cache_quotes RPC.
//
//   node scripts/fetch-quotes.mjs            (run from the repo root)
//
// Stooq is NOT used here: it was tested and rejected (404 / bot-check).
//
// Behaviour on a per-ticker failure: the previous data/quotes.json entry
// for that ticker is reused (and the run logs a warning). The run only
// fails (exit 1, no write) when a ticker has NEITHER fresh NOR previous
// data — the committed file is never clobbered with a partial feed.
//
// Output shape (see API.md for the full contract):
//   {
//     "asOf": "2026-11-20T15:00:00.000Z",
//     "marketState": "REGULAR" | "CLOSED",
//     "tickers": {
//       "AAPL": { "price": 250.12, "prevClose": 248.00, "open": 249.00,
//                 "high": 251.00, "low": 248.50, "changePct": 0.85,
//                 "candles": [[t_ms, o, h, l, c, v], ... up to 60 daily ...] },
//       ...
//     }
//   }
// "marketState" is derived from the New York clock: Mon-Fri 09:30-16:00 ET
// is REGULAR, anything else is CLOSED. The honest live/delayed/closed call
// is made server-side in getliveprices() from asOf staleness, not here.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'META', 'GOOGL', 'AMD'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'quotes.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function marketStateNow() {
  const ny = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dow = ny.getDay(); // 0 Sun .. 6 Sat
  const mins = ny.getHours() * 60 + ny.getMinutes();
  const open = dow >= 1 && dow <= 5 && mins >= 9 * 60 + 30 && mins < 16 * 60;
  return open ? 'REGULAR' : 'CLOSED';
}

async function fetchTicker(sym, attempt = 1) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=3mo&interval=1d`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('empty chart result');
    const meta = result.meta ?? {};
    const ts = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const closes = q.close ?? [];
    const candles = [];
    for (let i = 0; i < ts.length; i++) {
      const [o, h, l, c, v] = [q.open?.[i], q.high?.[i], q.low?.[i], closes[i], q.volume?.[i]];
      if (o == null || h == null || l == null || c == null) continue; // skip incomplete bars
      candles.push([ts[i] * 1000, +o.toFixed(2), +h.toFixed(2), +l.toFixed(2), +c.toFixed(2), v ?? 0]);
    }
    const last = candles[candles.length - 1];
    if (!last) throw new Error('no usable candles');
    const price = meta.regularMarketPrice ?? last[4];
    // NOTE: Yahoo's meta.chartPreviousClose is the close BEFORE the
    // requested range ( ~3 months ago for range=3mo ), NOT yesterday's
    // close — using it here produced nonsense changePct values (e.g.
    // NVDA -36%). Yesterday's close is the second-to-last candle.
    const prevClose = candles[candles.length - 2]?.[4] ?? last[4];
    const round2 = (n) => Math.round(n * 100) / 100;
    return {
      price: round2(price),
      prevClose: round2(prevClose),
      open: last[1],
      high: last[2],
      low: last[3],
      changePct: round2(((price - prevClose) / prevClose) * 100),
      candles: candles.slice(-60),
    };
  } catch (err) {
    if (attempt < 3) {
      await sleep(1000 * attempt);
      return fetchTicker(sym, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function loadPrevious() {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    return null;
  }
}

const previous = loadPrevious();
const tickers = {};
const failures = [];
for (const sym of TICKERS) {
  try {
    tickers[sym] = await fetchTicker(sym);
    console.log(`ok   ${sym} $${tickers[sym].price} (${tickers[sym].candles.length} candles)`);
  } catch (err) {
    const prev = previous?.tickers?.[sym];
    if (prev) {
      tickers[sym] = prev;
      failures.push(sym);
      console.warn(`warn ${sym} fetch failed (${err.message}) — reusing previous quote`);
    } else {
      console.error(`fail ${sym} fetch failed and no previous quote: ${err.message}`);
      process.exit(1);
    }
  }
}

const out = {
  asOf: new Date().toISOString(),
  marketState: marketStateNow(),
  tickers,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${OUT} — ${Object.keys(tickers).length} tickers, marketState=${out.marketState}` +
  (failures.length ? ` (stale: ${failures.join(', ')})` : ''));
