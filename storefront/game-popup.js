/* Kodra Play – gamification popup (storefront). Settings: app.metafields.gamediscount.config
 * Strict mode comes from the build ("use strict" is emitted by esbuild), which keeps this file small.
 * Source file. `npm run build:storefront` minifies it (and storefront/games/*)
 * into extensions/gamediscount-popup/assets/ — edit here, not there. */
(function () {
  if (window.__gameDiscountLoaded) return;
  window.__gameDiscountLoaded = true;

  // ---------- config ----------
  var cfgEl = document.getElementById('gd-config');
  if (!cfgEl) return;
  var cfg;
  try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
  var ctx = window.GameDiscountContext || {};
  // "Preview on store" from the app: shows that popup (drafts too) in test mode.
  var preview = (location.search.match(/[?&]gd_preview=([\w-]+)/) || [])[1];
  var testMode = !!ctx.alwaysShow || !!preview;
  if (ctx.designMode && !testMode) return; // don't pop over the theme editor unless testing
  var popups = (cfg && cfg.popups) || [];

  var template = String(ctx.template || '');
  var matches = function (p) {
    if (p.target === template) return true;
    return p.target === 'blog' && (template === 'blog' || template === 'article');
  };
  if (preview) {
    return fetch(ctx.proxy + '/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: preview }) })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (r.ok) run(r.popup); }, function () {});
  }
  // Specific page targets win over "all pages".
  var first = popups.filter(matches)[0] || popups.filter(function (p) { return p.target === 'all'; })[0];
  if (first) run(first);

  function run(popup) {

    // ---------- storage (can throw in private mode / blocked cookies) ----------
    function store(kind) {
      return {
        get: function (k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { window[kind].setItem(k, v); } catch (e) { /* ignore */ } }
      };
    }
    var local = store('localStorage');
    var session = store('sessionStorage');

    // A/B test: each visitor keeps one variant; B overlays its own settings.
    var ab = popup.ab;
    if (ab) {
      var KEY_V = 'gd_v_' + popup.id, variant = local.get(KEY_V) || (Math.random() < 0.5 ? 'a' : 'b');
      local.set(KEY_V, variant);
      if (variant == 'b') popup = Object.assign({}, popup, ab, { strings: Object.assign({}, popup.strings, ab.strings) });
    }
    var KEY_CLAIMED = 'gd_claimed_' + popup.id;
    var KEY_ATTEMPTS = 'gd_attempts_' + popup.id;
    var KEY_DISMISSED = 'gd_dismissed_' + popup.id;

    var KEY_TEASER_OFF = 'gd_teaser_off_' + popup.id;

    var maxAttempts = Math.max(1, popup.maxAttempts | 0);
    var attemptsUsed = testMode ? 0 : parseInt(local.get(KEY_ATTEMPTS) || '0', 10) || 0;

    // Claimed reward: { code, value, expiresAt }.
    var claimed = null;
    if (!testMode) {
      var rawClaim = local.get(KEY_CLAIMED);
      if (rawClaim) {
        try { claimed = JSON.parse(rawClaim); } catch (e) { /* unreadable: treat as not claimed */ }
        if (claimed && claimed.expiresAt && Date.parse(claimed.expiresAt) < Date.now()) return;
      }
      if (!claimed && attemptsUsed >= maxAttempts) return;
    }
    var dismissed = !testMode && !!session.get(KEY_DISMISSED);

    // ---------- language ----------
    // The app publishes fully resolved strings per language (defaults + merchant overrides).
    var all = popup.strings || {};
    // The storefront language Shopify serves (from the app embed), else the theme's <html lang>.
    var locale = ctx.locale || document.documentElement.lang || (window.Shopify && window.Shopify.locale) || 'en';
    var htmlLang = locale.toLowerCase();
    var lang = Object.keys(all).filter(function (k) { return htmlLang.indexOf(k) === 0; })[0] || 'en';
    var t = all[lang] || all.en;
    if (!t) return;


    // ---------- network (via app proxy, same origin) ----------
    // Exit intent needs a mouse; it also tells desktop (d) from phone/tablet (m) for analytics.
    var hasMouse = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    function post(path, body) {
      return fetch(ctx.proxy + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(Object.assign({ popupId: popup.id, v: popup.v, d: hasMouse ? 'd' : 'm', c: ctx.country }, body))
      }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
    }
    function track(type) {
      if (testMode) return;
      post('/track', { type: type }).catch(function () {});
    }


    // ---------- popup UI (gd-ui.js, loaded only when something is shown) ----------
    function script(src) {
      return new Promise(function (resolve, reject) {
        var sc = document.createElement('script');
        sc.src = src; sc.async = true; sc.onload = resolve; sc.onerror = reject;
        document.head.appendChild(sc);
      });
    }
    var ui;
    function withUI(fn) {
      ui = ui || script(ctx.assets.ui).then(function () {
        return window.GameDiscountUI({
          popup: popup, cfg: cfg, ctx: ctx, t: t, locale: locale, testMode: testMode,
          local: local, session: session, post: post, track: track, script: script,
          claimed: claimed, attemptsUsed: attemptsUsed, maxAttempts: maxAttempts,
          keys: { claimed: KEY_CLAIMED, attempts: KEY_ATTEMPTS, dismissed: KEY_DISMISSED, teaserOff: KEY_TEASER_OFF }
        });
      });
      ui.then(fn, function () {});
    }
    // The floating button alone: skip loading the UI when it can't show.
    function teaserOnly() {
      if (popup.teaser && !session.get(KEY_TEASER_OFF) && attemptsUsed < maxAttempts) withUI(function (u) { u.teaser(); });
    }

    // ---------- trigger ----------
    if (claimed) return withUI(function (u) { u.winner(); });
    if (dismissed) return teaserOnly();

    // Frequency cap for automatic opening (the floating button still works).
    var KEY_SHOWN = 'gd_shown_' + popup.id;
    var freq = popup.frequency || 'session';
    var capped = !testMode && (freq === 'session'
      ? session.get(KEY_SHOWN)
      : freq !== 'always' && Date.now() - (Number(local.get(KEY_SHOWN)) || 0) < (freq === 'day' ? 864e5 : 6048e5));
    if (capped) return teaserOnly();

    var fired = false;
    function fire() {
      if (fired) return;
      fired = true;
      session.set(KEY_SHOWN, '1');
      local.set(KEY_SHOWN, String(Date.now()));
      withUI(function (u) { u.open(); });
    }
    var mode = testMode ? 'delay' : popup.trigger || 'both';
    // Exit intent needs a mouse; touch devices always use the delay.
    if (mode !== 'delay' && hasMouse) {
      document.addEventListener('mouseout', function (e) {
        if (!e.relatedTarget && e.clientY <= 0) fire();
      });
    }
    if (mode !== 'exit' || !hasMouse) {
      setTimeout(fire, testMode ? 500 : Math.max(0, Number(popup.delaySec) || 0) * 1000);
    }
  }
})();
