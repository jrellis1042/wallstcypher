// Validate data/levels.json against the static game's composition rules.
// Run: node validate_levels.js   (exit 0 = pass)
const fs = require('fs');
const vm = require('vm');

const levels = JSON.parse(fs.readFileSync('data/levels.json', 'utf8'));
const src = fs.readFileSync('static-game-extract.js', 'utf8').split('\n');
const sb = {};
vm.createContext(sb);
vm.runInContext(src.slice(0, 131).join('\n'), sb); // banks + lessonFor (HISTORY is 46 cards now, Nov 20)
const { CORE, ADVANCED, COMPANIES, HISTORY, BOSSES, lessonFor, rng, pick } = sb;

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

check(Array.isArray(levels) && levels.length === 200, `expected 200 entries, got ${levels.length}`);
const FIELDS = ['n', 'act', 'title', 'lesson', 'takeaway', 'historyTitle', 'historyBody', 'historyTakeaway', 'ticker', 'tickerName', 'target', 'boss'];
const GATEWAYS = [25, 50, 75, 100, 125, 150, 175, 200];
const GATEWAY_BOSS = { 25: 'Gold Chain G', 50: 'Kangol Kenny', 75: 'Gold Chain G', 100: 'Kangol Kenny', 125: 'Gold Chain G', 150: 'Kangol Kenny', 175: 'Gold Chain G', 200: 'Kangol Kenny' };
const companyNames = new Set(COMPANIES.map(c => c[0]));
const bossNames = new Set(BOSSES.map(b => b[1]));

levels.forEach((L, i) => {
  const n = i + 1;
  check(L.n === n, `entry ${i}: n=${L.n}, expected ${n}`);
  const act = n <= 25 ? 1 : n <= 100 ? 2 : 3;
  check(L.act === act, `L${n}: act=${L.act}, expected ${act}`);
  // Every field present and non-empty (boss may be null; otherwise a boss name).
  FIELDS.forEach(f => {
    if (f === 'boss') {
      check(L.boss === null || (typeof L.boss === 'string' && L.boss.length > 0), `L${n}: boss invalid`);
    } else {
      check(L[f] !== undefined && L[f] !== null && String(L[f]).length > 0, `L${n}: field ${f} missing/empty`);
    }
  });
  // Boss exactly at multiples of 5.
  check((L.boss !== null) === (n % 5 === 0), `L${n}: boss=${L.boss}, expected ${n % 5 === 0 ? 'a boss' : 'null'}`);
  if (L.boss) check(bossNames.has(L.boss), `L${n}: unknown boss "${L.boss}"`);
  if (GATEWAYS.includes(n)) check(L.boss === GATEWAY_BOSS[n], `L${n}: gateway boss=${L.boss}, expected ${GATEWAY_BOSS[n]}`);
  // Ticker must be a themed COMPANIES ticker; never a real Live Desk ticker.
  check(companyNames.has(L.ticker), `L${n}: ticker ${L.ticker} not in COMPANIES`);
  check(!['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'META', 'GOOGL', 'AMD'].includes(L.ticker), `L${n}: real Live Desk ticker leaked into levels`);
  // Lesson/history text must match the static game's own lessonFor() verbatim.
  const S = lessonFor(n);
  check(L.title === S.title.replace(/^BOSS:\s*/, ''), `L${n}: title mismatch`);
  check(L.lesson === S.body, `L${n}: lesson body mismatch vs lessonFor()`);
  check(L.takeaway === S.tip, `L${n}: takeaway mismatch vs lessonFor()`);
  check(L.historyTitle === S.hist[0] && L.historyBody === S.hist[1] && L.historyTakeaway === S.hist[2], `L${n}: history mismatch vs lessonFor()`);
  // Ticker + target must match startLevel()'s seeded math (Rookie default).
  const r = rng(n * 7919 + 3);
  const comp = pick(r, COMPANIES);
  check(L.ticker === comp[0] && L.tickerName === comp[1], `L${n}: ticker mismatch vs seeded rng`);
  const startCash = 1000 + Math.min(4000, n * 20);
  const tier = Math.floor((n - 1) / 25);
  const targetPct = 0.06 + n * 0.0016 + tier * 0.03 + (n % 5 === 0 ? 0.06 : 0);
  check(L.target === Math.round(startCash * (1 + targetPct)), `L${n}: target=${L.target}, expected ${Math.round(startCash * (1 + targetPct))}`);
});

if (failures.length) {
  console.log(`VALIDATION FAILED — ${failures.length} failure(s):`);
  failures.slice(0, 30).forEach(f => console.log(' - ' + f));
  process.exit(1);
}
console.log('VALIDATION PASSED — 200 entries, sequential n 1–200, acts 1–25/26–100/101–200,');
console.log('bosses exactly at multiples of 5 (40), gateway bosses alternate Gold Chain G / Kangol Kenny,');
console.log('all fields present and non-empty, all lesson/history text verbatim vs lessonFor(),');
console.log('all tickers themed COMPANIES only, all tickers/targets match the static seeded math.');
