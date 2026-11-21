// Build data/levels.json from the static game's own content banks.
// Source: static-game-extract.js (script extracted verbatim from
// ~/workspace/your_files/stock-trading-game/stock-trading-game.html).
// Lesson/history text is lifted VERBATIM via the static game's own lessonFor().
// Ticker + target replicate startLevel()'s seeded math for the default
// (Rookie, teen/adult) profile: rng seed n*7919+3, first pick = company.
// Bosses follow the static cycle BOSSES[(floor(n/5)-1)%5], EXCEPT the eight
// gateway levels (25,50,75,100,125,150,175,200), which alternate
// Gold Chain G / Kangol Kenny starting with Gold Chain G at 25
// (25 = Gold Chain G is also what the static cycle gives there).
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync('static-game-extract.js', 'utf8').split('\n');
const slice = src.slice(0, 131).join('\n'); // banks + lessonFor + levelName + ACTS + BOSSES + NEWS (HISTORY is 46 cards now, Nov 20)
const sb = {};
vm.createContext(sb);
vm.runInContext(slice, sb);
const { CORE, ADVANCED, COMPANIES, HISTORY, BOSSES, lessonFor, rng, pick } = sb;

const GATEWAYS = [25, 50, 75, 100, 125, 150, 175, 200];
const GATEWAY_BOSS = { 25: 'Gold Chain G', 50: 'Kangol Kenny', 75: 'Gold Chain G', 100: 'Kangol Kenny', 125: 'Gold Chain G', 150: 'Kangol Kenny', 175: 'Gold Chain G', 200: 'Kangol Kenny' };

function actOf(n) { return n <= 25 ? 1 : n <= 100 ? 2 : 3; }

const levels = [];
for (let n = 1; n <= 200; n++) {
  const L = lessonFor(n);
  const isBoss = n % 5 === 0;
  // Ticker: replicate startLevel()'s seeded rng (Rookie default, offset 3).
  // First rng draw picks the company; pattern draw comes after and is not stored.
  const r = rng(n * 7919 + 3);
  const comp = pick(r, COMPANIES);
  // Target: replicate startLevel()'s Rookie, non-kid math (practice funds).
  const startCash = 1000 + Math.min(4000, n * 20);
  const tier = Math.floor((n - 1) / 25);
  const targetPct = 0.06 + n * 0.0016 + tier * 0.03 + (isBoss ? 0.06 : 0);
  const target = Math.round(startCash * (1 + targetPct));
  // Boss: static cycle, gateway override.
  let boss = null;
  if (isBoss) {
    boss = GATEWAYS.includes(n) ? GATEWAY_BOSS[n] : BOSSES[(Math.floor(n / 5) - 1) % BOSSES.length][1];
  }
  levels.push({
    n,
    act: actOf(n),
    // Display title: static game's level header strips a leading "BOSS: ".
    title: L.title.replace(/^BOSS:\s*/, ''),
    lesson: L.body,
    takeaway: L.tip,
    historyTitle: L.hist[0],
    historyBody: L.hist[1],
    historyTakeaway: L.hist[2],
    ticker: comp[0],
    tickerName: comp[1],
    target,
    boss,
  });
}

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/levels.json', JSON.stringify(levels, null, 2) + '\n');
console.log('Wrote data/levels.json with', levels.length, 'entries.');
// Coverage summary
const lessonCounts = {};
levels.forEach(l => { lessonCounts[l.title] = (lessonCounts[l.title] || 0) + 1; });
console.log('Distinct lesson titles:', Object.keys(lessonCounts).length);
const histCounts = {};
levels.forEach(l => { histCounts[l.historyTitle] = (histCounts[l.historyTitle] || 0) + 1; });
const histVals = Object.values(histCounts);
console.log('History cards used:', Object.keys(histCounts).length, 'min uses:', Math.min(...histVals), 'max uses:', Math.max(...histVals));
const bossCounts = {};
levels.forEach(l => { if (l.boss) bossCounts[l.boss] = (bossCounts[l.boss] || 0) + 1; });
console.log('Boss counts:', JSON.stringify(bossCounts));
console.log('Gateway bosses:', GATEWAYS.map(g => g + '=' + levels[g - 1].boss).join(', '));
console.log('Sample L1:', JSON.stringify(levels[0]));
console.log('Sample L25:', JSON.stringify(levels[24]));
console.log('Sample L200:', JSON.stringify(levels[199]));
