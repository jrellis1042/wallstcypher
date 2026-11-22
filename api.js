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
    // NOTE: PostgREST matches RPC arguments by PARAMETER NAME, so the JSON
    // keys below must match the p_-prefixed parameter names in schema.sql
    // exactly (e.g. p_username, not username) or the call 404s.
    return rpc('cypher_cache_quotes', { p_payload: payload });
  }

  const Api = {
    rpc: rpc,
    createProfile: (username, display_name, pin, tier) =>
      rpc('createprofile', { p_username: username, p_display_name: display_name, p_pin: pin, p_tier: tier }),
    loginProfile: (username, pin) => rpc('loginprofile', { p_username: username, p_pin: pin }),
    getSession: (token) => rpc('getsession', { p_token: token }),
    completeLevel: (token, level) => rpc('completelevel', { p_token: token, p_level: level }),
    updateTier: (token, tier) => rpc('updatetier', { p_token: token, p_tier: tier }),
    walletMove: (token, kind, amount) => rpc('walletmove', { p_token: token, p_kind: kind, p_amount: amount }),
    paperTrade: (token, ticker, side, qty, price) =>
      rpc('papertrade', { p_token: token, p_ticker: ticker, p_side: side, p_qty: qty, p_price: price }),
    placeOrder: (token, ticker, side, order_type, qty, limit_price, stop_price) =>
      rpc('placeorder', { p_token: token, p_ticker: ticker, p_side: side, p_order_type: order_type, p_qty: qty, p_limit_price: limit_price, p_stop_price: stop_price }),
    cancelOrder: (token, order_id) => rpc('cancelorder', { p_token: token, p_order_id: order_id }),
    getOrders: (token) => rpc('getorders', { p_token: token }),
    getLivePrices: () => rpc('getliveprices', {}),
    getPrices: () => rpc('getprices', {}),
    logEvent: (token, kind, detail) => rpc('logevent', { p_token: token, p_kind: kind, p_detail: detail }),
    ownerStatus: () => rpc('ownerstatus', {}),
    setupOwner: (name, owner_id, access_code) =>
      rpc('setupowner', { p_name: name, p_owner_id: owner_id, p_access_code: access_code }),
    loginOwner: (owner_id, access_code) => rpc('loginowner', { p_owner_id: owner_id, p_access_code: access_code }),
    getOwnerDashboard: (owner_token) => rpc('getownerdashboard', { p_owner_token: owner_token }),
    resetPlayerPin: (owner_token, username, pin) =>
      rpc('resetplayerpin', { p_owner_token: owner_token, p_username: username, p_new_pin: pin }),
    // Self-serve email recovery (Nov 21, 2026): the player resets their
    // OWN PIN from the login screen. Owner reset above stays as fallback.
    requestPinReset: (username) => rpc('requestpinreset', { p_username: username }),
    resetPinWithToken: (token, pin) =>
      rpc('resetpinwithtoken', { p_token: token, p_new_pin: pin }),
    setRecoveryEmail: (token, email) =>
      rpc('setrecoveryemail', { p_token: token, p_email: email }),
    dismissRecoveryPrompt: (token) => rpc('dismissrecoveryprompt', { p_token: token }),
    fetchQuotesFile: fetchQuotesFile,
    pushQuotes: pushQuotes
  };

  global.WSC_Api = Api;
})(window);
