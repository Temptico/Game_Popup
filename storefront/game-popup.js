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
  // Texts for the visitor's language, per popup ("<id>", "<id>:b" for variant B).
  var texts = null;
  try { texts = JSON.parse(document.getElementById('gd-strings').textContent); } catch (e) { /* older config: texts inside */ }
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
  // ---------- this visit (sessionStorage): where it came from, pages seen, a discount code it brought ----------
  var ss = function (k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { /* blocked */ }
    return null;
  };
  var q = function (n) { try { return new URLSearchParams(location.search).get(n) || ''; } catch (e) { return ''; } };
  var dec = function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } };
  var src = ss('gd_src');
  if (src === null) {
    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { /* keep */ }
    if (ref === location.hostname) ref = '';
    src = [q('utm_source'), q('utm_campaign'), ref, q('fbclid') ? 'fbclid' : ''].join(' ').toLowerCase();
    ss('gd_src', src);
  }
  var pages = (Number(ss('gd_pages')) || 0) + 1;
  ss('gd_pages', String(pages));
  var fromSrc = function (list) { return (list || []).some(function (s) { return src.indexOf(s) >= 0; }); };
  // A code from a link (/discount/CODE or ?discount=CODE) is kept for the visit; Shopify also keeps it in a cookie.
  var linkCode = (location.pathname.match(/\/discount\/([^/?#]+)/) || [])[1] || q('discount');
  if (linkCode) ss('gd_code', dec(linkCode));
  var cookieCode = (document.cookie.match(/(?:^|;\s*)discount_code=([^;]*)/) || [])[1];
  var visitCodes = [ss('gd_code'), cookieCode && dec(cookieCode)].concat(ctx.cartCodes || []);

  // Pages the merchant excluded (and the pages under them), also behind a language prefix (/en/...).
  var path = function (x) { try { x = decodeURI(x); } catch (e) { /* keep */ } return (x.replace(/\/+$/, '') || '/').toLowerCase(); };
  var here = path(location.pathname);
  var root = path((window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/');
  var paths = [here];
  if (root !== '/' && here.indexOf(root) === 0) paths.push(here.slice(root.length) || '/');
  var allowed = function (p) {
    return !(p.ex || []).some(function (e) {
      return paths.some(function (h) { return h === e || (e !== '/' && h.indexOf(e + '/') === 0); });
    });
  };
  // Scheduled pause set by the merchant: [start, end] in ms.
  var now = Date.now();
  popups = popups.filter(function (p) {
    return allowed(p) && !(p.off && now >= p.off[0] && now < p.off[1]) &&
      // Sources the merchant listed: not at all, or not on the visit's first page.
      !fromSrc(p.sa) && !(pages === 1 && fromSrc(p.sf));
  });
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

    if (!popup.strings && texts) {
      popup.strings = {}; popup.strings[ctx.lang] = texts[popup.id];
      if (popup.ab && texts[popup.id + ':b']) { popup.ab.strings = {}; popup.ab.strings[ctx.lang] = texts[popup.id + ':b']; }
    }
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
    var t = all[lang] || all.en || all[ctx.lang];
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
    // The popup's styles; a failed load still lets the popup open.
    function style(href) {
      return new Promise(function (resolve) {
        var l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = href; l.onload = resolve; l.onerror = resolve;
        document.head.appendChild(l);
      });
    }
    var ui;
    function withUI(fn) {
      ui = ui || Promise.all([script(ctx.assets.ui), ctx.assets.css && style(ctx.assets.css)]).then(function () {
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
    // The visitor already has someone else's code (an influencer link, a code in the cart): a second
    // code would only confuse them. Codes won in Kodra Play don't count.
    var own = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('gd_claimed_') === 0) own.push(String((JSON.parse(localStorage.getItem(k)) || {}).code || '').toUpperCase());
      }
    } catch (e) { /* blocked or unreadable */ }
    var foreign = function (list) {
      return list.some(function (c) { return c && String(c).split(',').some(function (x) { x = x.trim().toUpperCase(); return x && own.indexOf(x) < 0; }); });
    };
    var codeCheck = popup.hd && !testMode;
    if (codeCheck && foreign(visitCodes)) return;
    if (dismissed) return teaserOnly();

    // Frequency cap for automatic opening (the floating button still works).
    var KEY_SHOWN = 'gd_shown_' + popup.id, KEY_ONCE = 'gd_once_' + popup.id;
    var freq = popup.frequency || 'session';
    var capped = !testMode && (freq === 'session'
      ? session.get(KEY_SHOWN)
      : freq === 'once'
        ? local.get(KEY_ONCE)
        : freq !== 'always' && Date.now() - (Number(local.get(KEY_SHOWN)) || 0) < (freq === 'day' ? 864e5 : 6048e5));
    if (capped) return teaserOnly();
    // Shoppers with something in the cart are about to buy: don't interrupt them.
    var cartCheck = popup.nc && !testMode;
    if (cartCheck && ctx.cart > 0) return teaserOnly();

    var fired = false;
    function fire() {
      if (fired) return;
      fired = true;
      if (!cartCheck && !codeCheck) return show();
      // The cart may have changed since the page loaded (cart drawers add items and codes without a reload).
      fetch(((window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/') + 'cart.js', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (c) {
          var codes = (c.cart_level_discount_applications || []).filter(function (d) { return d.type === 'discount_code'; }).map(function (d) { return d.title; });
          if (!(cartCheck && c.item_count) && !(codeCheck && foreign(codes))) show();
        }, show);
    }
    function show() {
      session.set(KEY_SHOWN, '1');
      local.set(KEY_SHOWN, String(Date.now()));
      local.set(KEY_ONCE, '1');
      withUI(function (u) { u.open(); });
    }
    var mode = testMode ? 'delay' : popup.trigger || 'both';
    // Exit intent needs a mouse; touch devices use the delay and scrolling back up quickly.
    if ((mode === 'both' || mode === 'exit') && hasMouse) {
      document.addEventListener('mouseout', function (e) {
        if (!e.relatedTarget && e.clientY <= 0) fire();
      });
    }
    if (mode !== 'exit' || !hasMouse) {
      setTimeout(fire, testMode ? 500 : Math.max(0, Number(popup.delaySec) || 0) * 1000);
    }
    // Scrolled part of the page, or (phones) scrolled back up quickly after reading: about to leave.
    var upTouch = !hasMouse && (mode === 'both' || mode === 'exit');
    if (mode === 'scroll' || upTouch) {
      var lastY = window.scrollY, lastT = Date.now(), maxY = lastY;
      window.addEventListener('scroll', function () {
        var y = window.scrollY, t = Date.now(), h = document.documentElement.scrollHeight - window.innerHeight;
        if (mode === 'scroll' && h > 0 && (y / h) * 100 >= (popup.sp || 50)) fire();
        if (upTouch && maxY > 600 && lastY - y > 120 && t - lastT < 250) fire();
        if (t - lastT > 100) { lastY = y; lastT = t; }
        maxY = Math.max(maxY, y);
      }, { passive: true });
    }
  }
})();
