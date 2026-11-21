// app.js — Wall St. Cypher standalone frontend.
// Screens: door -> start -> app (map / trade floor / live desk / wallet / awards)
//          + level play + owners portal.
// All money is practice funds. Trade Floor prices are simulated (server-computed).
// Live Desk prices are real Yahoo quotes via data/quotes.json -> cypher_cache_quotes.
(function () {
  'use strict';
  var Api = window.WSC_Api;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var pct = function (n) { return (n >= 0 ? '+' : '') + Number(n || 0).toFixed(2) + '%'; };

  var TIERS = ['Little Legends', 'Rookie', 'Rookie · Kid Mode', 'Teen Trader', 'Adult Trader'];
  var TIER_NOTES = {
    'Little Legends': 'Little Legends: big buttons, simple words, gentle charts — tuned for a 7-year-old and a 4-year-old learning together.',
    'Rookie': 'Rookie: the standard road — 200 levels, real lessons, real stakes (practice funds).',
    'Rookie · Kid Mode': 'Rookie · Kid Mode: the standard road with simpler words and extra encouragement.',
    'Teen Trader': 'Teen Trader: faster charts, bigger targets, same 200 levels.',
    'Adult Trader': 'Adult Trader: the full run — sharper targets, no training wheels.'
  };
  var LIVE_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'META', 'GOOGL', 'AMD'];
  var COMPANY_NAMES = { AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'NVIDIA', AMZN: 'Amazon', TSLA: 'Tesla', META: 'Meta', GOOGL: 'Alphabet (Google)', AMD: 'AMD' };
  // Stock of the Week — one live ticker, spotlighted on the Trade Floor.
  // Stories are static, kid-friendly (ages 4–7 and up), honest, no hype,
  // no promises about the price. A history tie appears ONLY where it fits
  // naturally (Apple / Amazon); the rest carry no forced tie.
  var STOCK_OF_WEEK = {
    AAPL: { story: 'Apple makes the iPhone, the iPad, and the Mac — the phones and computers a lot of us carry every day. People tap, type, draw, and make music on them. When you buy a share of Apple, you own a tiny piece of the company that makes those tools.',
      history: 'In Greenwood, Tulsa — Black Wall Street — ownership was the whole point: own a piece of something real. A share of Apple is the same idea, one tiny slice at a time.' },
    MSFT: { story: 'Microsoft makes Windows, the system that runs a lot of school and library computers, and Xbox, the game console. It also makes the tools grown-ups use to write, count, and plan at work. A share of Microsoft is a tiny piece of the company behind the computers and the games.' },
    NVDA: { story: 'NVIDIA makes the special chips that draw the pictures in video games and movies — the race cars, the explosions, the whole world on the screen. Without those chips, games would look flat and slow. A share of NVIDIA is a tiny piece of the company that draws the game world.' },
    AMZN: { story: 'Amazon is the store that comes to your door. You pick something on a phone or computer, and a truck brings it to your house. A share of Amazon is a tiny piece of the biggest door-to-door store in the world.',
      history: 'Madam C.J. Walker built an empire selling hair products door to door, one customer at a time — and became one of the first Black women millionaires. Amazon is the same idea, grown huge: bring the store to the people.' },
    TSLA: { story: 'Tesla makes electric cars — cars that plug in like a phone instead of drinking gasoline. They are quiet, quick, and they leave no smoke behind. A share of Tesla is a tiny piece of the company betting the future drives electric.' },
    META: { story: 'Meta runs Facebook, Instagram, and WhatsApp — the apps families use to share photos, call grandma, and keep up with cousins far away. A share of Meta is a tiny piece of the company that keeps people connected.' },
    GOOGL: { story: 'Google is the search box — ask it a question and it finds the answer. Alphabet is the company that owns Google, plus YouTube, where the whole world watches and learns. A share of Alphabet is a tiny piece of the company that helps everyone look things up.' },
    AMD: { story: 'AMD makes the chips inside game consoles and computers — the brains that do the thinking while you play. When a game loads fast and runs smooth, an AMD chip is often doing the work. A share of AMD is a tiny piece of the company that powers the play.' }
  };
  // Deterministic weekly rotation: every player sees the same pick.
  // Weeks count from the first Monday of 2026 (Jan 5), in UTC, so the
  // pick flips on Monday everywhere.
  var SOTW_EPOCH = Date.UTC(2026, 0, 5);
  function stockOfWeek(date) {
    var d = date || new Date();
    var dayUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    var idx = Math.floor((dayUtc - SOTW_EPOCH) / (7 * 24 * 60 * 60 * 1000));
    var pick = ((idx % LIVE_TICKERS.length) + LIVE_TICKERS.length) % LIVE_TICKERS.length;
    var next = (pick + 1) % LIVE_TICKERS.length;
    var monday = new Date(SOTW_EPOCH + idx * 7 * 24 * 60 * 60 * 1000);
    return { ticker: LIVE_TICKERS[pick], weekOf: monday, nextTicker: LIVE_TICKERS[next], weekIndex: idx };
  }
  var GATEWAYS = [25, 50, 75, 100, 125, 150, 175, 200];
  // Acts are the eras of hip-hop, beginning to end — the whole journey,
  // not one decade. Act I is where it started, Act II the golden age,
  // Act III where the culture stands today.
  var ACTS = [
    { n: 1, name: 'Act I — The Beginning', range: [1, 25], desc: 'Levels 1–25 · The Bronx, 1973 — where it all started. Two turntables, a mic, and a party that changed the world. Learn what a stock is, how the market moves, and why ownership matters. Clear 25 to open Act II.' },
    { n: 2, name: 'Act II — The Golden Age', range: [26, 100], desc: 'Levels 26–100 · The 80s and 90s — the rise, the legends, the sound spreading from the Bronx to every block in America. Mastery rounds — the same big ideas, harder charts, bigger targets. Clear 100 to open Act III.' },
    { n: 3, name: 'Act III — The Modern Era', range: [101, 200], desc: 'Levels 101–200 · The 2000s to today — hip-hop as the biggest culture on the planet. The full legacy run. Clear 200 and earn Trader Ready.' }
  ];
  var SKILLS = [
    ['market_order', 'Place a market order', 'Buy or sell at the market price, Live Desk or Trade Floor.'],
    ['limit_fill', 'Place a limit order that fills', 'Set your price — and have the market come meet it.'],
    ['stop_loss', 'Set a stop-loss', 'Place an order carrying a stop price. Pros always know their exit.'],
    ['take_profit', 'Set a take-profit', 'Place a take-profit order and lock in a gain.'],
    ['diversified', 'Hold 3+ tickers at once', 'Hold positions in three different tickers at the same time.'],
    ['profitable_close', 'Close a trade at a profit', 'Sell for more than your average cost.']
  ];
  var ACHIEVEMENTS = [
    ['🎤', 'First Steps', 'Complete level 1', function (s) { return s.progress.level >= 1; }],
    ['🌟', 'Little Legend', 'Complete 5 levels', function (s) { return s.progress.level >= 5; }],
    ['👑', 'Boss Slayer', 'Beat your first boss (level 5)', function (s) { return s.progress.level >= 5; }],
    ['🚪', 'Gateway 1', 'Clear level 25 — the Live Desk opens', function (s) { return s.progress.level >= 25; }],
    ['🏛️', 'Empire Builder', 'Clear level 50', function (s) { return s.progress.level >= 50; }],
    ['💪', 'Halfway Hero', 'Clear level 100 — Act III opens', function (s) { return s.progress.level >= 100; }],
    ['🔥', 'On Fire', 'Clear level 150', function (s) { return s.progress.level >= 150; }],
    ['👑', 'Final Boss', 'Clear level 200', function (s) { return s.progress.level >= 200; }],
    ['💰', 'First Trade', 'Make your first trade', function (s) { return (s.wallet.total_deposited > 0) || (s.holdings && s.holdings.length > 0); }],
    ['📈', 'Chart Reader', 'Earn the market-order skill', function (s) { return !!(s.progress.skills && s.progress.skills.market_order); }],
    ['🛡️', 'Risk Manager', 'Earn the stop-loss skill', function (s) { return !!(s.progress.skills && s.progress.skills.stop_loss); }],
    ['🎯', 'Patient Hunter', 'Earn the filled-limit skill', function (s) { return !!(s.progress.skills && s.progress.skills.limit_fill); }],
    ['🌈', 'Diversified', 'Hold 3+ tickers at once', function (s) { return !!(s.progress.skills && s.progress.skills.diversified); }],
    ['🏆', 'Profit Maker', 'Close a trade at a profit', function (s) { return !!(s.progress.skills && s.progress.skills.profitable_close); }],
    ['🎓', 'Trader Ready', 'All 200 levels + all six skills', function (s) { return !!s.progress.trader_ready; }]
  ];

  var state = {
    token: localStorage.getItem('wsc_token') || null,
    profile: null, progress: null, wallet: null, holdings: [], transactions: [],
    levels: [], sim: null, live: null, quotesFile: null,
    currentLevel: null, simTicker: null, liveTicker: null,
    simQty: 1, liveQty: 1, lvlQty: 1, sessionOrders: [],
    ownerToken: localStorage.getItem('wsc_owner_token') || null,
    ownerDash: null, tab: 'map'
  };

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    setTimeout(function () { t.classList.add('hidden'); }, 4000);
  }
  function showErr(id, msg) { var e = $(id); if (!e) return; e.textContent = msg; e.style.display = 'block'; }
  function hideErr(id) { var e = $(id); if (e) e.style.display = 'none'; }
  function showMsg(id, msg, ok) { var e = $(id); if (!e) return; e.textContent = msg; e.className = 'msg ' + (ok ? 'ok' : 'bad'); }
  function logLine(msg) { var l = $('lvl-log'); if (!l) return; var d = document.createElement('div'); d.textContent = msg; l.prepend(d); }
  function logEvent(kind, detail) {
    if (!state.token) return;
    Api.logEvent(state.token, kind, detail).catch(function () { /* best effort */ });
  }

  // ---------- charts (canvas) ----------
  function drawCandles(canvas, candles, opts) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!candles || !candles.length) { ctx.fillStyle = '#888'; ctx.font = '16px sans-serif'; ctx.fillText('No chart data yet.', 20, 40); return; }
    var lo = Infinity, hi = -Infinity;
    candles.forEach(function (c) { lo = Math.min(lo, c[3]); hi = Math.max(hi, c[2]); });
    var pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    var bw = W / candles.length;
    var x = function (i) { return i * bw + bw / 2; };
    var y = function (v) { return H - 14 - ((v - lo) / (hi - lo)) * (H - 28); };
    // gold marker on latest price
    var last = candles[candles.length - 1];
    ctx.strokeStyle = '#FFB800'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, y(last[4])); ctx.lineTo(W, y(last[4])); ctx.stroke(); ctx.setLineDash([]);
    candles.forEach(function (c, i) {
      var up = c[4] >= c[1];
      ctx.strokeStyle = up ? '#12805C' : '#E6392B';
      ctx.fillStyle = up ? '#12805C' : '#E6392B';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x(i), y(c[2])); ctx.lineTo(x(i), y(c[3])); ctx.stroke();
      var top = y(Math.max(c[1], c[4])), bot = y(Math.min(c[1], c[4]));
      ctx.fillRect(x(i) - Math.max(2, bw * 0.28), top, Math.max(4, bw * 0.56), Math.max(2, bot - top));
    });
    if (opts && opts.volume) {
      var vmax = 0; candles.forEach(function (c) { vmax = Math.max(vmax, c[5] || 0); });
      candles.forEach(function (c, i) {
        var h = vmax ? ((c[5] || 0) / vmax) * 34 : 0;
        ctx.fillStyle = 'rgba(0,144,179,0.35)';
        ctx.fillRect(x(i) - Math.max(2, bw * 0.28), H - h, Math.max(4, bw * 0.56), h);
      });
    }
  }
  function drawSpark(canvas, candles) {
    if (!canvas || !candles || candles.length < 2) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var vals = candles.map(function (c) { return c[4]; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
    var up = vals[vals.length - 1] >= vals[0];
    ctx.strokeStyle = up ? '#12805C' : '#E6392B'; ctx.lineWidth = 2;
    ctx.beginPath();
    vals.forEach(function (v, i) {
      var px = (i / (vals.length - 1)) * (W - 4) + 2;
      var py = H - 4 - ((v - lo) / (hi - lo)) * (H - 8);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // ---------- screens ----------
  function showOnly(id) {
    ['screen-door', 'screen-start', 'screen-app', 'screen-level', 'screen-owner'].forEach(function (s) {
      var el = $(s); if (!el) return;
      el.style.display = (s === id) ? '' : 'none';
      // The 'show' class is what actually displays a screen: styles.css
      // hides every .screen by default and only .screen.show renders.
      // (Inline display='' alone does NOT beat the ID-selector display:none
      // rules that used to live in styles.css, which is why app/level/owner
      // rendered blank. Those ID rules are removed; the class is the switch.)
      // #screen-door has no .screen class (it is a flex .door layout), so
      // its visibility still rides on the inline display above.
      el.classList.toggle('show', s === id);
    });
    window.scrollTo(0, 0);
  }

  // ---------- session ----------
  async function refreshSession() {
    if (!state.token) return false;
    try {
      var s = await Api.getSession(state.token);
      state.profile = s.profile; state.progress = s.progress;
      state.wallet = s.wallet; state.holdings = s.holdings || [];
      state.transactions = s.transactions || [];
      renderProfile(); return true;
    } catch (e) {
      if (e.status === 400 || e.status === 401) { signOut(); toast('Session ended — please sign in again.'); }
      return false;
    }
  }
  function signOut() {
    state.token = null; state.profile = null;
    localStorage.removeItem('wsc_token');
    showOnly('screen-door');
  }
  function renderProfile() {
    var p = state.profile, pr = state.progress, w = state.wallet;
    if (!p || !pr || !w) return;
    $('pf-name').textContent = p.display_name + '  ·  @' + p.username;
    $('pf-tier').textContent = p.tier + '  ·  Level ' + pr.level + ' of 200  ·  ' + pr.xp + ' XP  ·  ' + pr.stars + ' ★' +
      (pr.trader_ready ? '  ·  🎓 Trader Ready' : '');
    $('pf-progress').style.width = (pr.level / 200 * 100) + '%';
    $('pf-balance').textContent = money(w.balance);
    $('pf-account').textContent = 'Account value ' + money(w.account_value) + ' · Deposited ' + money(w.total_deposited) + ' (practice)';
    $('hud-chips').innerHTML =
      '<span class="chip gold">Level ' + pr.level + '/200</span>' +
      '<span class="chip">' + pr.xp + ' XP</span>' +
      '<span class="chip">' + pr.stars + ' ★</span>' +
      '<span class="chip">' + money(w.balance) + ' practice</span>' +
      (pr.gateway ? '<span class="chip">Gateway ' + pr.gateway + '</span>' : '');
    var kid = (p.tier === 'Little Legends' || p.tier === 'Rookie · Kid Mode');
    document.body.classList.toggle('kid-mode', kid);
    $('pf-face').textContent = p.tier === 'Little Legends' ? '🌟' : '🎤';
    renderStart();
    renderMap(); renderAwards(); renderWallet();
    var badge = $('live-badge');
    if (pr.level >= 25) { badge.textContent = 'Open'; badge.classList.add('open'); }
    else { badge.textContent = 'Locked · Lvl 25'; badge.classList.remove('open'); }
  }
  function renderStart() {
    var p = state.profile, pr = state.progress, w = state.wallet;
    if (!p) return;
    var first = p.display_name.split(' ')[0];
    $('start-title').textContent = "YOU'RE IN, " + first.toUpperCase() + '!';
    $('start-sub').textContent = p.tier === 'Little Legends'
      ? 'Big fun, small words, gentle charts — the cypher is yours, superstar.'
      : 'The cypher is yours. Two hundred levels, our history, one legacy.';
    $('start-chips').innerHTML =
      '<span class="chip gold">Level ' + pr.level + ' / 200</span>' +
      '<span class="chip">' + pr.xp + ' XP</span>' +
      '<span class="chip">' + pr.stars + ' ★ Stars</span>' +
      '<span class="chip">Wallet ' + money(w.balance) + ' (practice)</span>' +
      '<span class="chip">' + esc(p.tier) + '</span>';
  }
  function goStart() { showOnly('screen-start'); }
  function goApp(tab) { showOnly('screen-app'); switchTab(tab || 'map'); }

  // ---------- level map ----------
  function levelDone(n) { return state.progress && state.progress.level >= n; }
  function levelOpen(n) { return state.progress && state.progress.level + 1 >= n; }
  function renderMap() {
    if (!state.levels.length || !state.progress) return;
    var gw = $('gateway-row');
    gw.innerHTML = GATEWAYS.map(function (g) {
      var open = state.progress.level >= g;
      var next = state.progress.level + 1 === g;
      return '<div class="gate-chip ' + (open ? 'open' : 'locked') + '">' + (open ? '🔓' : '🔒') +
        ' Gateway ' + (GATEWAYS.indexOf(g) + 1) + '<br><small>Level ' + g + (next ? ' — next!' : '') + '</small></div>';
    }).join('');
    var actsEl = $('acts'); actsEl.innerHTML = '';
    ACTS.forEach(function (act) {
      var wrap = document.createElement('div'); wrap.className = 'act';
      var levels = state.levels.filter(function (l) { return l.act === act.n; });
      var head = document.createElement('div'); head.className = 'act-head';
      head.innerHTML = '<h2>' + esc(act.name) + '</h2><span class="marker spray">Levels ' + act.range[0] + '–' + act.range[1] + '</span>';
      var desc = document.createElement('p'); desc.className = 'desc'; desc.textContent = act.desc;
      var grid = document.createElement('div'); grid.className = 'levels';
      levels.forEach(function (lv) {
        var b = document.createElement('button');
        var done = levelDone(lv.n), open = levelOpen(lv.n), isNext = state.progress.level + 1 === lv.n;
        b.type = 'button';
        b.className = 'level-btn' + (lv.boss ? ' boss' : '') + (done ? ' done' : '') + (!open ? ' locked' : '') + (isNext ? ' next' : '');
        b.innerHTML = '<small>' + (lv.boss ? '👑 BOSS · ' : '') + 'Level ' + lv.n + ' · ' + esc(lv.ticker) + '</small>' +
          '<b>' + esc(lv.title) + '</b>' +
          '<span class="stars">' + (done ? '★' : (open ? '☆' : '🔒')) + '</span>';
        b.disabled = !open;
        b.addEventListener('click', function () { openLevel(lv.n); });
        grid.appendChild(b);
      });
      wrap.appendChild(head); wrap.appendChild(desc); wrap.appendChild(grid);
      actsEl.appendChild(wrap);
    });
  }

  // ---------- level play ----------
  function holdingFor(ticker) {
    var h = (state.holdings || []).find(function (x) { return x.ticker === ticker; });
    return h || { ticker: ticker, shares: 0, avg_cost: 0, current_price: null };
  }
  async function openLevel(n) {
    var lv = state.levels.find(function (l) { return l.n === n; });
    if (!lv) return;
    state.currentLevel = lv; state.lvlQty = 1; $('lvl-qty').textContent = '1';
    hideErr('lvl-msg'); var m = $('lvl-msg'); m.className = 'msg'; m.textContent = '';
    $('lvl-title').textContent = 'Level ' + lv.n + ' — ' + lv.title;
    $('lvl-meta').textContent = 'Act ' + ['I', 'II', 'III'][lv.act - 1] + ' · ' + lv.tickerName + ' (' + lv.ticker + ') · Practice target ' + money(lv.target);
    $('lvl-lesson').textContent = lv.lesson;
    $('lvl-takeaway').textContent = lv.takeaway;
    $('lvl-hist-title').textContent = lv.historyTitle;
    $('lvl-hist-body').textContent = lv.historyBody;
    $('lvl-hist-take').textContent = lv.historyTakeaway;
    $('lvl-ticker').textContent = lv.ticker;
    $('lvl-ticker-name').textContent = lv.tickerName;
    var bb = $('lvl-boss');
    if (lv.boss) { bb.classList.add('show'); $('lvl-boss-name').textContent = '👑 BOSS — ' + lv.boss; }
    else bb.classList.remove('show');
    $('lvl-log').innerHTML = '';
    state.levelTraded = false;
    showOnly('screen-level');
    logEvent('screen_view', { screen: 'level', level: n });
    await loadSim();
    updateLevelPanel();
    var t = state.sim && state.sim.tickers && state.sim.tickers[lv.ticker];
    if (t && t.candles) drawCandles($('chart'), t.candles, {});
  }
  function updateCompleteBtn() {
    var lv = state.currentLevel; if (!lv) return;
    var btn = $('lvl-complete');
    btn.disabled = !state.levelTraded;
    $('lvl-coach').textContent = state.levelTraded
      ? 'Trade is in — nice work. Hit Complete to bank the XP and open the next level.'
      : 'Coach: make a practice trade first — buy or sell ' + lv.ticker + ' — then the Complete button lights up.';
  }
  function updateLevelPanel() {
    var lv = state.currentLevel; if (!lv) return;
    var t = state.sim && state.sim.tickers && state.sim.tickers[lv.ticker];
    var h = holdingFor(lv.ticker);
    $('lvl-price').textContent = t ? money(t.price) + '  (' + pct(t.changePct) + ')' : '—';
    $('lvl-price').className = 'price ' + (t && t.changePct >= 0 ? 'up' : 'down');
    $('lvl-target').textContent = money(lv.target);
    $('lvl-cash').textContent = money(state.wallet ? state.wallet.balance : 0);
    $('lvl-shares').textContent = h.shares;
    $('lvl-value').textContent = money((h.shares || 0) * (t ? t.price : (h.avg_cost || 0)));
    updateCompleteBtn();
  }
  async function levelTrade(side) {
    var lv = state.currentLevel; if (!lv) return;
    var t = state.sim && state.sim.tickers && state.sim.tickers[lv.ticker];
    if (!t) { showMsg('lvl-msg', 'Practice prices are still loading — try again in a moment.', false); return; }
    try {
      var r = await Api.paperTrade(state.token, lv.ticker, side, state.lvlQty, t.price);
      await refreshSession(); updateLevelPanel();
      state.levelTraded = true; updateCompleteBtn();
      showMsg('lvl-msg', (side === 'buy' ? 'Bought ' : 'Sold ') + r.qty + ' ' + lv.ticker + ' at ' + money(r.price) + ' (practice). Balance ' + money(r.balance) + '.', true);
      logLine((side === 'buy' ? 'Bought ' : 'Sold ') + r.qty + ' ' + lv.ticker + ' @ ' + money(r.price));
      logEvent('trade', { desk: 'trade_floor', ticker: lv.ticker, side: side, qty: state.lvlQty, simulated: true });
    } catch (e) { showMsg('lvl-msg', e.message, false); }
  }
  async function completeCurrentLevel() {
    var lv = state.currentLevel; if (!lv) return;
    if (!state.levelTraded) {
      showMsg('lvl-msg', 'Make a practice trade first — buy or sell ' + lv.ticker + ' — then complete the level.', false);
      return;
    }
    try {
      var r = await Api.completeLevel(state.token, lv.n);
      await refreshSession();
      if (lv.n === 25) { showGatewayCeremony(lv, r); logEvent('level_complete', { level: lv.n }); return; }
      $('modal-emoji').textContent = lv.boss ? '👑' : '🎉';
      $('modal-title').textContent = 'Level ' + lv.n + ' complete!';
      $('modal-body').textContent = '+' + r.xp_gain + ' XP · ' + r.stars + ' star' + (r.stars === 1 ? '' : 's') + ' · Level ' + r.level + ' of 200.' +
        (GATEWAYS.indexOf(lv.n) >= 0 ? ' Gateway cleared — a new gate just swung open!' : '') +
        (r.trader_ready ? ' 🎓 TRADER READY — you did it!' : '');
      $('modal').classList.add('show');
      logEvent('level_complete', { level: lv.n });
    } catch (e) { showMsg('lvl-msg', e.message, false); }
  }

  // ---------- Gateway 1 ceremony (level 25) ----------
  // A real celebration, distinct from the quiet level-complete modal:
  // a certificate moment for the player, and the server already wrote
  // the 'gateway_unlocked' note into the Owners Portal activity feed
  // (see completelevel in schema.sql). The gateway lock itself is
  // untouched — the server still enforces level 25 before the Live Desk.
  function showGatewayCeremony(lv, r) {
    var p = state.profile;
    $('ceremony-name').textContent = p ? p.display_name : 'Trader';
    $('ceremony-sub').textContent = '+' + r.xp_gain + ' XP · Gateway 1 cleared · Level 25 of 200.';
    var today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    $('ceremony-meta').textContent = 'Cleared ' + today + ' · Live Desk open · Practice cap $500 · Practice funds only';
    // The history card from the level just cleared — the story rides on
    // the certificate, so the moment carries the culture too.
    if (lv.historyTitle) {
      $('ceremony-hist-title').textContent = lv.historyTitle;
      $('ceremony-hist-body').textContent = lv.historyBody;
      $('ceremony-hist-take').textContent = lv.historyTakeaway;
    }
    $('ceremony-modal').classList.add('show');
  }

  // ---------- tabs ----------
  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.app-tabs button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
    });
    ['map', 'tradefloor', 'livedesk', 'wallet', 'awards'].forEach(function (t) {
      $('tab-' + t).classList.toggle('show', t === tab);
    });
    logEvent('screen_view', { screen: tab });
    if (tab === 'tradefloor') { loadSim().then(renderSim); renderStockOfWeek(); }
    if (tab === 'livedesk') loadLive();
    if (tab === 'wallet') renderWallet();
    if (tab === 'awards') renderAwards();
    if (tab === 'map') renderMap();
  }

  // ---------- Trade Floor (simulated) ----------
  async function loadSim() {
    if (state.sim) return state.sim;
    try {
      state.sim = await Api.getPrices();
      var b = $('sim-banner');
      b.textContent = state.sim.label || 'SIMULATED PRACTICE — these prices are made up for learning, not real market data.';
      return state.sim;
    } catch (e) {
      $('sim-banner').textContent = 'Practice prices are unavailable right now (' + e.message + '). Try again in a moment — no prices are shown rather than fake ones.';
      return null;
    }
  }
  function renderSim() {
    var grid = $('sim-grid'); grid.innerHTML = '';
    if (!state.sim || !state.sim.tickers) { grid.innerHTML = '<p class="sub">Practice feed unavailable.</p>'; return; }
    Object.keys(state.sim.tickers).forEach(function (sym) {
      var t = state.sim.tickers[sym];
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'trade-card' + (state.simTicker === sym ? ' sel' : '');
      card.innerHTML = '<h3>' + esc(sym) + '</h3><div class="small">' + esc(t.name || sym) + '</div>' +
        '<div class="big">' + money(t.price) + '</div>' +
        '<div class="' + (t.changePct >= 0 ? 'up-t' : 'down-t') + '" style="font-weight:800">' + pct(t.changePct) + ' today</div>' +
        '<canvas class="spark" width="220" height="44"></canvas>' +
        '<div class="small">SIMULATED PRACTICE</div>';
      card.addEventListener('click', function () { state.simTicker = sym; renderSim(); renderSimDetail(); });
      grid.appendChild(card);
      drawSpark(card.querySelector('canvas'), t.candles);
    });
    renderHoldings();
  }
  // ---------- Stock of the Week ----------
  // One live ticker, spotlighted on the Trade Floor. The price comes from
  // the existing Yahoo quotes feed (getliveprices); if the feed is down
  // the story still shows and NO price is shown rather than a fake one.
  async function renderStockOfWeek() {
    var el = $('sotw'); if (!el) return;
    var pick = stockOfWeek();
    var info = STOCK_OF_WEEK[pick.ticker] || {};
    var weekStr = pick.weekOf.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    var priceHtml = '<p class="small">Real price unavailable right now — no price is shown rather than a fake one. The story below is still this week\u2019s pick.</p>';
    try {
      var live = await Api.getLivePrices();
      var t = live && live.tickers && live.tickers[pick.ticker];
      if (t && t.price != null) {
        var stateTxt = live.feedState === 'live' ? 'LIVE' : live.feedState === 'delayed' ? 'DELAYED' : live.feedState === 'market_closed' ? 'LAST CLOSE' : 'FEED DOWN';
        priceHtml = '<div class="big">' + money(t.price) + ' <span class="' + (t.changePct >= 0 ? 'up-t' : 'down-t') + '" style="font-size:16px;font-weight:800">' + pct(t.changePct) + ' today</span></div>' +
          '<p class="small">REAL PRICE · ' + esc(stateTxt) + ' (Yahoo Finance) — the price moves every day; the story does not.</p>';
      }
    } catch (e) { /* price stays unavailable; the story still shows */ }
    el.innerHTML =
      '<div class="sotw-head"><span class="marker spray">⭐ Stock of the Week</span><span class="small">Week of ' + esc(weekStr) + '</span></div>' +
      '<h3>' + esc(pick.ticker) + ' — ' + esc(COMPANY_NAMES[pick.ticker] || pick.ticker) + '</h3>' +
      priceHtml +
      '<p>' + esc(info.story || '') + '</p>' +
      (info.history ? '<p class="history-line">✊ Our history: ' + esc(info.history) + '</p>' : '') +
      '<p class="small">A story, not a tip — this is not a promise the price will go up. Practice funds only.</p>' +
      '<p class="small">Next week: <b>' + esc(pick.nextTicker) + ' — ' + esc(COMPANY_NAMES[pick.nextTicker] || pick.nextTicker) + '</b></p>' +
      '<p><button type="button" class="btn dark" id="sotw-desk" style="max-width:340px">See ' + esc(pick.ticker) + ' on the Live Desk →</button></p>';
    var btn = $('sotw-desk');
    if (btn) btn.addEventListener('click', function () { switchTab('livedesk'); });
  }
  function renderSimDetail() {
    var sym = state.simTicker; if (!sym || !state.sim) return;
    var t = state.sim.tickers[sym];
    $('sim-detail').classList.remove('hidden');
    $('sim-detail-name').textContent = sym + ' — ' + (t.name || sym) + ' · ' + money(t.price) + ' (' + pct(t.changePct) + ')';
    drawCandles($('sim-chart'), t.candles, {});
    var h = holdingFor(sym);
    $('sim-detail-stats').innerHTML =
      '<div class="pf"><b>' + money(t.open != null ? t.open : t.prevClose) + '</b><span>Open / prev close</span></div>' +
      '<div class="pf"><b>' + money(t.prevClose) + '</b><span>Prev close</span></div>' +
      '<div class="pf"><b>' + pct(t.changePct) + '</b><span>Change today</span></div>' +
      '<div class="pf"><b>' + h.shares + '</b><span>Shares you hold</span></div>';
  }
  function renderHoldings() {
    var el = $('holdings-table');
    if (!state.holdings || !state.holdings.length) { el.innerHTML = '<p class="small">No positions yet — pick a ticker above and make your first practice trade.</p>'; return; }
    var rows = state.holdings.map(function (h) {
      var val = h.shares * (h.current_price != null ? h.current_price : h.avg_cost);
      return '<tr><td><b>' + esc(h.ticker) + '</b></td><td>' + h.shares + '</td><td>' + money(h.avg_cost) + '</td><td>' + money(h.current_price != null ? h.current_price : h.avg_cost) + '</td><td>' + money(val) + '</td></tr>';
    }).join('');
    el.innerHTML = '<table class="hold-table"><thead><tr><th>Ticker</th><th>Shares</th><th>Avg cost</th><th>Price</th><th>Value</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="small">Live tickers show the real cached price; themed tickers show the simulated practice price. All practice funds.</p>';
  }
  async function simTrade(side) {
    var sym = state.simTicker; if (!sym) { showMsg('sim-msg', 'Pick a ticker first.', false); return; }
    var t = state.sim.tickers[sym];
    var stop = null;
    if (side === 'buy') {
      var v = prompt('Stop price (optional — leave blank for none). A stop keeps your risk inside the 2% rule. Current price ' + money(t.price) + ':');
      if (v === null) return;
      if (v.trim() !== '') { stop = parseFloat(v); if (isNaN(stop) || stop <= 0) { showMsg('sim-msg', 'That stop price is not a number — try again.', false); return; } }
    }
    try {
      // papertrade has no stop argument in the RPC; a stop is recorded on
      // Live Desk orders. For the Trade Floor we trade at the shown price.
      var r = await Api.paperTrade(state.token, sym, side, state.simQty, t.price);
      await refreshSession(); renderSim(); renderSimDetail();
      showMsg('sim-msg', (side === 'buy' ? 'Bought ' : 'Sold ') + r.qty + ' ' + sym + ' at ' + money(r.price) + ' (SIMULATED PRACTICE). Balance ' + money(r.balance) + '.' + (stop ? ' Stop noted at ' + money(stop) + ' — set it on a Live Desk order to lock it in.' : ''), true);
      logEvent('trade', { desk: 'trade_floor', ticker: sym, side: side, qty: state.simQty, simulated: true });
    } catch (e) { showMsg('sim-msg', e.message, false); }
  }

  // ---------- Live Desk (real prices) ----------
  async function loadLive() {
    var locked = !state.progress || state.progress.level < 25;
    $('live-locked').classList.toggle('hidden', !locked);
    $('live-open').classList.toggle('hidden', locked);
    if (locked) {
      $('live-state-badge').textContent = '🔒 Locked — level 25';
      var li = $('req-level');
      li.textContent = 'Level 25 — Gateway 1' + (state.progress ? ' (you are on level ' + state.progress.level + ')' : '');
      li.classList.toggle('done', !!(state.progress && state.progress.level >= 25));
      return;
    }
    $('live-state-badge').textContent = '● Loading real prices…';
    // 1) quotes.json same-origin -> push to server cache (best effort)
    try {
      var q = await Api.fetchQuotesFile();
      state.quotesFile = q;
      try { await Api.pushQuotes(q); } catch (e) { /* server may already be fresher; getliveprices below is the authority */ }
    } catch (e) {
      state.quotesFile = null;
    }
    // 2) server feed state is the authority
    try {
      var live = await Api.getLivePrices();
      state.live = live;
      renderLive(live);
      try {
        var ords = await Api.getOrders(state.token);
        if (Array.isArray(ords)) { state.sessionOrders = ords; renderSessionOrders(); }
      } catch (e) { /* open-orders list is best-effort; orders placed this session still show */ }
    } catch (e) {
      state.live = null;
      var b = $('live-banner');
      b.className = 'feed-banner down';
      b.textContent = 'Live feed unreachable — ' + e.message + '. No prices are shown rather than fake ones. Trading is paused until the feed returns.';
      $('live-asof').textContent = '';
      $('live-grid').innerHTML = '';
    }
  }
  function feedLabel(live) {
    var s = live.feedState || 'feed_unreachable';
    var when = live.asOf ? new Date(live.asOf).toLocaleString() : 'unknown time';
    if (s === 'live') return { cls: 'live', text: '● LIVE — REAL MARKET DATA (Yahoo Finance). Market open, quotes fresh. As of ' + when + '.' };
    if (s === 'delayed') return { cls: 'live', text: '◐ DELAYED — REAL MARKET DATA (Yahoo Finance). Market open, quotes ' + (live.note || 'delayed') + ' As of ' + when + '.' };
    if (s === 'market_closed') return { cls: 'closed', text: '○ MARKET CLOSED — prices shown are the last close, as of ' + when + '. Real data, not simulated.' };
    return { cls: 'down', text: '✕ FEED UNREACHABLE — no fresh real prices. Last close ' + (live.asOf ? 'as of ' + when : 'unknown') + '. Trading is paused; nothing here is simulated.' };
  }
  function renderLive(live) {
    var fl = feedLabel(live);
    var b = $('live-banner'); b.className = 'feed-banner ' + fl.cls; b.textContent = fl.text;
    $('live-asof').textContent = (live.label || 'REAL MARKET DATA') + (live.note ? ' — ' + live.note : '');
    $('live-state-badge').textContent = live.feedState === 'live' ? '● LIVE' : live.feedState === 'delayed' ? '◐ DELAYED' : live.feedState === 'market_closed' ? '○ CLOSED' : '✕ UNREACHABLE';
    var grid = $('live-grid'); grid.innerHTML = '';
    var tickers = live.tickers || {};
    LIVE_TICKERS.forEach(function (sym) {
      var t = tickers[sym];
      var card = document.createElement('button');
      card.type = 'button'; card.className = 'trade-card' + (state.liveTicker === sym ? ' sel' : '');
      if (!t) {
        card.innerHTML = '<h3>' + sym + '</h3><div class="small">No price in this feed update.</div>';
      } else {
        card.innerHTML = '<h3>' + esc(sym) + '</h3>' +
          '<div class="big">' + money(t.price) + '</div>' +
          '<div class="' + (t.changePct >= 0 ? 'up-t' : 'down-t') + '" style="font-weight:800">' + pct(t.changePct) + '</div>' +
          '<canvas class="spark" width="220" height="44"></canvas>' +
          '<div class="small">REAL PRICE · ' + esc(live.feedState || '') + '</div>';
        card.addEventListener('click', function () { state.liveTicker = sym; renderLive(live); renderLiveDetail(); });
        grid.appendChild(card);
        drawSpark(card.querySelector('canvas'), t.candles);
        return;
      }
      grid.appendChild(card);
    });
  }
  function renderLiveDetail() {
    var sym = state.liveTicker; if (!sym || !state.live) return;
    var t = state.live.tickers[sym]; if (!t) return;
    $('live-detail').classList.remove('hidden');
    $('live-detail-name').textContent = sym + ' · ' + money(t.price) + ' (' + pct(t.changePct) + ') — REAL PRICE';
    drawCandles($('live-chart'), t.candles, { volume: true });
    $('live-detail-stats').innerHTML =
      '<div class="pf"><b>' + money(t.open) + '</b><span>Open</span></div>' +
      '<div class="pf"><b>' + money(t.high) + '</b><span>High</span></div>' +
      '<div class="pf"><b>' + money(t.low) + '</b><span>Low</span></div>' +
      '<div class="pf"><b>' + money(t.prevClose) + '</b><span>Prev close</span></div>';
  }
  async function placeLiveOrder() {
    var sym = state.liveTicker;
    if (!sym) { showMsg('live-msg', 'Pick a ticker first.', false); return; }
    if (state.live && state.live.feedState === 'feed_unreachable') {
      showMsg('live-msg', 'Feed unreachable — Live Desk trading is paused until real prices return. Nothing here is simulated.', false); return;
    }
    var side = $('live-side').value, type = $('live-type').value;
    var priceRaw = $('live-price').value.trim();
    var limit = null, stop = null;
    if (type === 'limit' || type === 'take_profit') {
      limit = parseFloat(priceRaw);
      if (isNaN(limit) || limit <= 0) { showMsg('live-msg', 'Enter a limit / take-profit price first.', false); return; }
    }
    if (type === 'stop') {
      stop = parseFloat(priceRaw);
      if (isNaN(stop) || stop <= 0) { showMsg('live-msg', 'Enter a stop price first.', false); return; }
    }
    if (type === 'market' && priceRaw !== '') { stop = parseFloat(priceRaw); if (isNaN(stop) || stop <= 0) stop = null; }
    try {
      var r = await Api.placeOrder(state.token, sym, side, type, state.liveQty, limit, stop);
      await refreshSession();
      state.sessionOrders.unshift(r);
      renderSessionOrders();
      showMsg('live-msg', 'Order ' + r.status + ': ' + side + ' ' + r.qty + ' ' + sym + ' (' + type + ')' +
        (r.filled_price != null ? ' filled at ' + money(r.filled_price) + ' (real price)' : ' — open, waiting on the real price') +
        '. Balance ' + money(r.balance) + '.', true);
      logEvent('trade', { desk: 'live', ticker: sym, side: side, order_type: type, qty: state.liveQty, simulated: false });
    } catch (e) { showMsg('live-msg', e.message, false); }
  }
  function renderSessionOrders() {
    var el = $('orders-list');
    if (!state.sessionOrders.length) return;
    el.innerHTML = state.sessionOrders.map(function (o) {
      return '<div class="feed-item"><div><b>' + esc(o.side) + ' ' + o.qty + ' ' + esc(o.ticker) + '</b> · ' + esc(o.order_type) +
        ' · ' + esc(o.status) + (o.filled_price != null ? ' @ ' + money(o.filled_price) : '') + '</div>' +
        (o.status === 'open' ? '<button type="button" class="icon-btn" data-cancel="' + esc(o.order_id) + '">Cancel</button>' : '') + '</div>';
    }).join('');
    el.querySelectorAll('[data-cancel]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          var r = await Api.cancelOrder(state.token, btn.dataset.cancel);
          state.sessionOrders = state.sessionOrders.map(function (o) { return o.order_id === r.order_id ? Object.assign({}, o, { status: 'cancelled' }) : o; });
          renderSessionOrders(); toast('Order cancelled.');
        } catch (e) { showMsg('live-msg', e.message, false); }
      });
    });
  }

  // ---------- wallet ----------
  function renderWallet() {
    if (!state.wallet || !state.progress) return;
    $('wallet-balance').textContent = money(state.wallet.balance);
    var cap = state.progress.deposit_cap;
    $('wallet-cap').textContent = cap == null
      ? 'Deposit cap: uncapped — you cleared level 200. (Practice funds.)'
      : 'Deposit cap: ' + money(cap) + ' total · Deposited so far ' + money(state.wallet.total_deposited) +
        ' · Next gateway at level ' + (state.progress.next_gateway_level || '—') + '. Withdrawals do not restore headroom. (Practice funds.)';
    var tx = $('tx-list');
    tx.innerHTML = (state.transactions || []).length
      ? state.transactions.map(function (t) {
          return '<div><span>' + esc(t.kind) + ' · ' + esc(t.note || '') + '<br><small>' + new Date(t.created_at).toLocaleString() + '</small></span><b>' + (t.amount >= 0 ? '+' : '') + money(t.amount) + '</b></div>';
        }).join('')
      : '<p class="small">No wallet moves yet.</p>';
  }
  async function walletMove(kind) {
    var amt = parseFloat($('wallet-amount').value);
    if (isNaN(amt) || amt <= 0) { showMsg('wallet-msg', 'Enter an amount above $0.', false); return; }
    try {
      var r = await Api.walletMove(state.token, kind, amt);
      await refreshSession();
      showMsg('wallet-msg', (kind === 'deposit' ? 'Added ' : 'Took out ') + money(r.amount) + ' practice funds. Balance ' + money(r.balance) + '.', true);
    } catch (e) { showMsg('wallet-msg', e.message, false); }
  }

  // ---------- awards ----------
  function renderAwards() {
    if (!state.progress) return;
    var pr = state.progress;
    var tr = $('trader-ready');
    tr.innerHTML = pr.trader_ready
      ? '<div class="gate open" style="display:block;text-align:center"><h3 style="margin:0">🎓 TRADER READY</h3><p style="margin:6px 0 0">All 200 levels complete and all six skills earned. Certified — the cypher is yours.</p></div>'
      : '<div class="gate"><div><b>Trader Ready — ' + (pr.level >= 200 ? 'levels done, skills to go' : 'level ' + pr.level + ' of 200') + '</b><br><span class="small">Finish all 200 levels AND all six skills below. Discipline score: ' + (pr.discipline_score != null ? pr.discipline_score : '—') + '/100.</span></div></div>';
    $('award-gateways').innerHTML = GATEWAYS.map(function (g) {
      var open = pr.level >= g;
      return '<div class="gate-chip ' + (open ? 'open' : 'locked') + '">' + (open ? '🔓' : '🔒') + ' Gateway ' + (GATEWAYS.indexOf(g) + 1) + '<br><small>Level ' + g + '</small></div>';
    }).join('');
    $('skills-list').innerHTML = SKILLS.map(function (sk) {
      var got = !!(pr.skills && pr.skills[sk[0]]);
      return '<div class="skill-row"><span>' + (got ? '✅' : '⬜') + ' ' + esc(sk[1]) + ' <span class="small">— ' + esc(sk[2]) + '</span></span><b>' + (got ? 'Earned' : 'Not yet') + '</b></div>';
    }).join('');
    $('awards-grid').innerHTML = ACHIEVEMENTS.map(function (a) {
      var got = false;
      try { got = a[3](state); } catch (e) { got = false; }
      return '<div class="award' + (got ? ' earned' : '') + '"><span class="emoji">' + a[0] + '</span><b>' + esc(a[1]) + '</b><span>' + esc(a[2]) + '</span><br><b>' + (got ? '✓ Earned' : 'Not yet') + '</b></div>';
    }).join('');
  }

  // ---------- owners portal ----------
  function showOwner() {
    showOnly('screen-owner');
    $('owner-dash').classList.add('hidden');
    $('owner-login-wrap').classList.remove('hidden');
    hideErr('err-owner');
    Api.ownerStatus().then(function (s) {
      var exists = !!(s && s.owner_exists);
      $('owner-setup').classList.toggle('hidden', exists);
      $('owner-login').classList.toggle('hidden', !exists);
    }).catch(function (e) { showErr('err-owner', 'Could not reach the server: ' + e.message); });
    if (state.ownerToken) loadOwnerDash();
  }
  async function loadOwnerDash() {
    try {
      var d = await Api.getOwnerDashboard(state.ownerToken);
      state.ownerDash = d;
      $('owner-login-wrap').classList.add('hidden');
      $('owner-dash').classList.remove('hidden');
      var t = d.totals || {};
      var kpis = [
        ['Players', t.players, 'registered players', ''],
        ['Trader Ready', t.trader_ready, 'certified players', 'gold'],
        ['Levels completed', t.levels_completed, 'across all players', ''],
        ['Total XP', t.total_xp, 'across all players', ''],
        ['Practice cash in wallets', money(t.total_practice_cash), 'deposited ' + money(t.total_deposited) + ' · withdrawn ' + money(t.total_withdrawn), 'dark'],
        ['Live orders', t.live_orders, t.live_orders_filled + ' filled', ''],
        ['Trade Floor trades', t.trade_floor_trades, 'simulated practice trades', ''],
        ['Events logged', t.events_total, 'all time', '']
      ];
      $('owner-kpis').innerHTML = kpis.map(function (k) {
        return '<div class="kpi ' + k[3] + '"><span>' + esc(k[0]) + '</span><b>' + esc(String(k[1] == null ? '—' : k[1])) + '</b><small>' + esc(k[2]) + '</small></div>';
      }).join('');
      $('owner-feed').innerHTML = (d.activity || []).map(function (a) {
        var det = a.detail || {};
        return '<div class="feed-item"><div><b>' + esc(a.username || '?') + '</b> · ' + esc(a.kind) +
          (det.ticker ? ' · ' + esc(det.ticker) : '') + (det.level ? ' · level ' + det.level : '') +
          (det.screen ? ' · ' + esc(det.screen) : '') +
          (det.note ? '<br><span class="small">' + esc(det.note) + '</span>' : '') + '</div><time>' + new Date(a.created_at).toLocaleString() + '</time></div>';
      }).join('') || '<p class="small">No activity yet.</p>';
      // Family leaderboard — ranked by XP earned in the last 7 days
      // (the server orders it); rank is the row position.
      var lb = d.leaderboard || [];
      var medals = ['🥇', '🥈', '🥉'];
      var topXp = lb.length ? lb[0].weekly_xp : 0;
      $('owner-leaderboard').innerHTML = lb.map(function (r, i) {
        return '<tr' + (i === 0 && r.weekly_xp > 0 ? ' class="leader-first"' : '') + '><td><b>' + (medals[i] || ('#' + (i + 1))) + '</b></td><td><b>' + esc(r.display_name) + '</b><br><small>@' + esc(r.username) + '</small></td><td>' + esc(r.tier) + '</td><td><b>+' + r.weekly_xp + ' XP</b></td><td>' + r.weekly_levels + '</td><td>Level ' + r.level + '</td></tr>';
      }).join('') || '<tr><td colspan="6">No players yet.</td></tr>';
      $('owner-leaderboard-note').textContent = topXp > 0
        ? 'Ranked by XP earned in the last 7 days — not total XP. Everyone starts fresh every week.'
        : 'No levels completed in the last 7 days yet — the board resets every week, so the next level anyone clears takes the lead.';
      // Black History Spotlight — one true story a week, for the whole
      // family to see. Same weekly rotation as Stock of the Week, so every
      // player and parent sees the same card. No server change: the card
      // comes from the levels data already loaded at boot.
      var spot = null;
      if (state.levels && state.levels.length === 200) {
        var wi = stockOfWeek().weekIndex;
        spot = state.levels[((wi % 200) + 200) % 200];
      }
      if (spot) {
        $('owner-hist-title').textContent = spot.historyTitle;
        $('owner-hist-body').textContent = spot.historyBody;
        $('owner-hist-take').textContent = spot.historyTakeaway;
      }
      var traffic = d.traffic_by_screen || [];
      var max = 1; traffic.forEach(function (r) { max = Math.max(max, r.events); });
      $('owner-traffic').innerHTML = traffic.map(function (r) {
        return '<div class="bar-row"><span>' + esc(r.screen) + '</span><div class="bar-track"><i style="width:' + Math.round(r.events / max * 100) + '%"></i></div><span>' + r.events + '</span></div>';
      }).join('') || '<p class="small">No screen traffic yet.</p>';
      var tc = $('traffic-chart');
      if (tc) {
        var ctx = tc.getContext('2d'); ctx.clearRect(0, 0, tc.width, tc.height);
        traffic.forEach(function (r, i) {
          var h = (r.events / max) * 140;
          ctx.fillStyle = ['#F72585', '#FFB800', '#0090B3', '#6C2BD9', '#12805C'][i % 5];
          ctx.fillRect(20 + i * 60, 170 - h, 40, h);
          ctx.fillStyle = '#888'; ctx.font = '11px sans-serif';
          ctx.fillText(String(r.events), 20 + i * 60, 185);
        });
      }
      $('owner-roster').innerHTML = (d.roster || []).map(function (r) {
        return '<tr><td><b>' + esc(r.display_name) + '</b><br><small>@' + esc(r.username) + '</small></td><td>' + esc(r.tier) + '</td><td>' + r.level + '</td><td>' + r.xp + '</td><td>+' + (r.weekly_xp || 0) + '</td><td>' + (r.weekly_levels || 0) + '</td><td>' + r.stars + ' ★</td><td>' + money(r.balance) + '</td><td>' + (r.discipline_score != null ? r.discipline_score : '—') + '</td><td>' + (r.trader_ready ? '🎓 Yes' : '—') + '</td></tr>';
      }).join('') || '<tr><td colspan="10">No players yet.</td></tr>';
    } catch (e) {
      showErr('err-owner', e.message);
      $('owner-login-wrap').classList.remove('hidden');
      $('owner-dash').classList.add('hidden');
    }
  }
  function exportRosterCsv() {
    var d = state.ownerDash; if (!d || !d.roster) { toast('Load the dashboard first.'); return; }
    var head = ['username', 'display_name', 'tier', 'level', 'xp', 'weekly_xp', 'weekly_levels', 'stars', 'balance', 'account_value', 'discipline_score', 'trader_ready', 'joined', 'last_active'];
    var q = function (v) { var s = String(v == null ? '' : v); return '"' + s.replace(/"/g, '""') + '"'; };
    var csv = head.join(',') + '\n' + d.roster.map(function (r) {
      return head.map(function (h) { return q(r[h]); }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wall-st-cypher-roster.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---------- auth forms ----------
  var selectedTier = 'Little Legends';
  function bindAuth() {
    document.querySelectorAll('#tier-seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        selectedTier = b.dataset.tier;
        document.querySelectorAll('#tier-seg button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $('tier-note').textContent = TIER_NOTES[selectedTier];
      });
    });
    $('tab-create').addEventListener('click', function () {
      $('tab-create').setAttribute('aria-pressed', 'true'); $('tab-login').setAttribute('aria-pressed', 'false');
      $('form-create').classList.remove('hidden'); $('form-login').classList.add('hidden');
    });
    $('tab-login').addEventListener('click', function () {
      $('tab-login').setAttribute('aria-pressed', 'true'); $('tab-create').setAttribute('aria-pressed', 'false');
      $('form-login').classList.remove('hidden'); $('form-create').classList.add('hidden');
    });
    $('form-create').addEventListener('submit', async function (e) {
      e.preventDefault(); hideErr('err-create');
      var name = $('f-name').value.trim(), user = $('f-user').value.trim().toLowerCase(), pin = $('f-pin').value.trim();
      if (!name) { showErr('err-create', 'Pick a stage name first.'); return; }
      if (!/^[a-z0-9_]{3,20}$/.test(user)) { showErr('err-create', 'Username: 3–20 characters, letters, numbers and _ only.'); return; }
      if (!/^\d{4}$/.test(pin)) { showErr('err-create', 'Your game PIN must be exactly 4 digits.'); return; }
      try {
        await Api.createProfile(user, name, pin, selectedTier);
        var s = await Api.loginProfile(user, pin);
        state.token = s.token; localStorage.setItem('wsc_token', s.token);
        await refreshSession(); goStart();
        toast('Welcome to the cypher, ' + name + '!');
      } catch (err) { showErr('err-create', err.message); }
    });
    $('form-login').addEventListener('submit', async function (e) {
      e.preventDefault(); hideErr('err-login');
      var user = $('l-user').value.trim().toLowerCase(), pin = $('l-pin').value.trim();
      if (!user || !/^\d{4}$/.test(pin)) { showErr('err-login', 'Enter your username and 4-digit PIN.'); return; }
      try {
        var s = await Api.loginProfile(user, pin);
        state.token = s.token; localStorage.setItem('wsc_token', s.token);
        await refreshSession(); goStart();
      } catch (err) { showErr('err-login', err.message); }
    });
  }

  // ---------- wire up ----------
  function bind() {
    bindAuth();
    $('btn-owner-door').addEventListener('click', showOwner);
    $('btn-owner-app').addEventListener('click', showOwner);
    $('btn-owner-back').addEventListener('click', function () { state.token ? goStart() : showOnly('screen-door'); });
    $('btn-start-game').addEventListener('click', function () { goApp('map'); });
    $('btn-signout-start').addEventListener('click', signOut);
    $('btn-signout').addEventListener('click', signOut);
    $('btn-change-tier').addEventListener('click', async function () {
      var t = prompt('New tier (' + TIERS.join(' / ') + '):', state.profile.tier);
      if (!t || TIERS.indexOf(t) < 0) { if (t) toast('That tier is not on the list.'); return; }
      try { await Api.updateTier(state.token, t); await refreshSession(); toast('Tier changed to ' + t + '. Progress kept.'); }
      catch (e) { toast(e.message); }
    });
    $('btn-wallet-jump').addEventListener('click', function () { switchTab('wallet'); });
    document.querySelectorAll('.app-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { switchTab(b.dataset.tab); });
    });
    $('btn-back-map').addEventListener('click', function () { goApp('map'); });
    // level qty + trades
    var q = function (which, delta) {
      if (which === 'lvl') { state.lvlQty = Math.max(1, Math.min(10, state.lvlQty + delta)); $('lvl-qty').textContent = state.lvlQty; }
      if (which === 'sim') { state.simQty = Math.max(1, Math.min(10, state.simQty + delta)); $('sim-qty').textContent = state.simQty; }
      if (which === 'live') { state.liveQty = Math.max(1, state.liveQty + delta); $('live-qty').textContent = state.liveQty; }
    };
    $('lvl-qty-minus').addEventListener('click', function () { q('lvl', -1); });
    $('lvl-qty-plus').addEventListener('click', function () { q('lvl', 1); });
    $('sim-qty-minus').addEventListener('click', function () { q('sim', -1); });
    $('sim-qty-plus').addEventListener('click', function () { q('sim', 1); });
    $('live-qty-minus').addEventListener('click', function () { q('live', -1); });
    $('live-qty-plus').addEventListener('click', function () { q('live', 1); });
    $('lvl-buy').addEventListener('click', function () { levelTrade('buy'); });
    $('lvl-sell').addEventListener('click', function () { levelTrade('sell'); });
    $('lvl-complete').addEventListener('click', completeCurrentLevel);
    $('sim-buy').addEventListener('click', function () { simTrade('buy'); });
    $('sim-sell').addEventListener('click', function () { simTrade('sell'); });
    $('sim-stop').addEventListener('click', function () {
      toast('Stops live on the Live Desk (level 25+): place an order there with a stop price to earn the stop-loss skill.');
      switchTab('livedesk');
    });
    $('live-place').addEventListener('click', placeLiveOrder);
    $('live-type').addEventListener('change', function () {
      $('live-price').placeholder = { market: 'Optional protective stop price ($)', limit: 'Limit price ($)', stop: 'Stop price ($)', take_profit: 'Take-profit price ($)' }[$('live-type').value];
    });
    document.querySelectorAll('.preset-row button').forEach(function (b) {
      b.addEventListener('click', function () { $('wallet-amount').value = b.dataset.amt; });
    });
    $('wallet-deposit').addEventListener('click', function () { walletMove('deposit'); });
    $('wallet-withdraw').addEventListener('click', function () { walletMove('withdraw'); });
    // modal
    $('modal-map').addEventListener('click', function () { $('modal').classList.remove('show'); goApp('map'); });
    $('modal-next').addEventListener('click', function () {
      $('modal').classList.remove('show');
      var next = state.currentLevel ? state.currentLevel.n + 1 : 1;
      if (next > 200) { goApp('awards'); return; }
      if (levelOpen(next)) openLevel(next); else goApp('map');
    });
    // ceremony (Gateway 1)
    $('ceremony-map').addEventListener('click', function () { $('ceremony-modal').classList.remove('show'); goApp('map'); });
    $('ceremony-desk').addEventListener('click', function () { $('ceremony-modal').classList.remove('show'); goApp('livedesk'); });
    // owner
    $('btn-owner-setup').addEventListener('click', async function () {
      hideErr('err-owner');
      var name = $('o-setup-name').value.trim() || 'Tye';
      var id = $('o-setup-id').value.trim().toLowerCase();
      var code = $('o-setup-code').value;
      if (!id || code.length < 6) { showErr('err-owner', 'Owner ID is required and the access code needs at least 6 characters.'); return; }
      try {
        await Api.setupOwner(name, id, code);
        toast('Owner account created. Sign in below.');
        $('owner-setup').classList.add('hidden'); $('owner-login').classList.remove('hidden');
        $('o-id').value = id;
      } catch (e) { showErr('err-owner', e.message); }
    });
    $('btn-owner-login').addEventListener('click', async function () {
      hideErr('err-owner');
      var id = $('o-id').value.trim().toLowerCase(), code = $('o-code').value;
      if (!id || !code) { showErr('err-owner', 'Enter your Owner ID and access code.'); return; }
      try {
        var s = await Api.loginOwner(id, code);
        state.ownerToken = s.token; localStorage.setItem('wsc_owner_token', s.token);
        $('owner-name').textContent = s.name || 'Tye';
        await loadOwnerDash();
      } catch (e) { showErr('err-owner', e.message); }
    });
    $('btn-owner-refresh').addEventListener('click', loadOwnerDash);
    $('btn-owner-csv').addEventListener('click', exportRosterCsv);
    $('btn-owner-signout').addEventListener('click', function () {
      state.ownerToken = null; localStorage.removeItem('wsc_owner_token');
      $('owner-dash').classList.add('hidden'); $('owner-login-wrap').classList.remove('hidden');
    });
    $('btn-forgot').addEventListener('click', function () {
      $('recover-panel').classList.toggle('hidden');
    });
    $('btn-reset-pin').addEventListener('click', async function () {
      hideErr('err-reset'); $('reset-ok').textContent = '';
      var user = $('reset-user').value.trim().toLowerCase();
      var pin = $('reset-pin').value.trim();
      if (!user || !/^\d{4}$/.test(pin)) { showErr('err-reset', 'Enter the player username and a new 4-digit PIN.'); return; }
      if (!state.ownerToken) { showErr('err-reset', 'Sign in to the Owners Portal first.'); return; }
      try {
        var r = await Api.resetPlayerPin(state.ownerToken, user, pin);
        $('reset-ok').textContent = 'PIN reset for ' + (r.username || user) + '. They can log in with the new PIN now.';
        $('reset-pin').value = '';
      } catch (e) { showErr('err-reset', e.message); }
    });
  }

  // ---------- boot ----------
  async function boot() {
    bind();
    try {
      var res = await fetch('data/levels.json', { cache: 'no-store' });
      state.levels = await res.json();
      if (!Array.isArray(state.levels) || state.levels.length !== 200) {
        console.warn('levels.json did not load 200 entries:', state.levels && state.levels.length);
      }
    } catch (e) { console.warn('levels.json failed to load:', e.message); }
    if (state.token) {
      var ok = await refreshSession();
      if (ok) { goStart(); return; }
    }
    showOnly('screen-door');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
