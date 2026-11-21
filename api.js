// api.js — Wall St. Cypher Supabase PostgREST client.
// All calls: POST /rest/v1/rpc/<name> with apikey + Bearer anon key.
// Error shape from the backend: {code, message} — message is shown to the player.
(function (global) {
  'use strict';

  function cfg() {
    const c = global.WSC_CONFIG || {};
    if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) {
      throw new Error('Supabase is not configured yet — config.js is missing.');
    }
    return c;
  }

  async function rpc(name, args) {
    const c = cfg();
    const url = c.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + name;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': c.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + c.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(args || {})
      });
    } catch (e) {
      throw new Error('Could not reach the game server. Check your connection and try again.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      const msg = (data && (data.message || data.msg)) || ('Server error (' + res.status + ')');
      const err = new Error(msg);
      err.code = data && data.code;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // Quotes file (written by the GitHub Actions workflow) is fetched
  // same-origin and pushed to the server cache so the server can validate
  // Live Desk orders against real prices.
  async function fetchQuotesFile() {
    const res = await fetch('data/quotes.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('quotes.json missing (HTTP ' + res.status + ')');
    return res.json();
  }

  async function pushQuotes(payload) {
    return rpc('cypher_cache_quotes', { payload: payload });
  }

  const Api = {
    rpc: rpc,
    createProfile: (username, display_name, pin, tier) =>
      rpc('createprofile', { username: username, display_name: display_name, pin: pin, tier: tier }),
    loginProfile: (username, pin) => rpc('loginprofile', { username: username, pin: pin }),
    getSession: (token) => rpc('getsession', { token: token }),
    completeLevel: (token, level) => rpc('completelevel', { token: token, level: level }),
    updateTier: (token, tier) => rpc('updatetier', { token: token, tier: tier }),
    walletMove: (token, kind, amount) => rpc('walletmove', { token: token, kind: kind, amount: amount }),
    paperTrade: (token, ticker, side, qty, price) =>
      rpc('papertrade', { token: token, ticker: ticker, side: side, qty: qty, price: price }),
    placeOrder: (token, ticker, side, order_type, qty, limit_price, stop_price) =>
      rpc('placeorder', { token: token, ticker: ticker, side: side, order_type: order_type, qty: qty, limit_price: limit_price, stop_price: stop_price }),
    cancelOrder: (token, order_id) => rpc('cancelorder', { token: token, order_id: order_id }),
    getOrders: (token) => rpc('getorders', { token: token }),
    getLivePrices: () => rpc('getliveprices', {}),
    getPrices: () => rpc('getprices', {}),
    logEvent: (token, kind, detail) => rpc('logevent', { token: token, kind: kind, detail: detail }),
    ownerStatus: () => rpc('ownerstatus', {}),
    setupOwner: (name, owner_id, access_code) =>
      rpc('setupowner', { name: name, owner_id: owner_id, access_code: access_code }),
    loginOwner: (owner_id, access_code) => rpc('loginowner', { owner_id: owner_id, access_code: access_code }),
    getOwnerDashboard: (owner_token) => rpc('getownerdashboard', { owner_token: owner_token }),
    fetchQuotesFile: fetchQuotesFile,
    pushQuotes: pushQuotes
  };

  global.WSC_Api = Api;
})(window);
