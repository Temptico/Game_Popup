/* Enigma Play – gamification popup (storefront). Settings: app.metafields.gamediscount.config
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
  var testMode = !!ctx.alwaysShow;
  if (ctx.designMode && !testMode) return; // don't pop over the theme editor unless testing
  var popups = (cfg && cfg.popups) || [];

  var template = String(ctx.template || '');
  var matches = function (p) {
    if (p.target === template) return true;
    return p.target === 'blog' && (template === 'blog' || template === 'article');
  };
  // Specific page targets win over "all pages".
  var popup = popups.filter(matches)[0] || popups.filter(function (p) { return p.target === 'all'; })[0];
  if (!popup) return;

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

  // Claimed reward: { code, value, expiresAt } (older builds stored the bare code).
  var claimed = null;
  if (!testMode) {
    var rawClaim = local.get(KEY_CLAIMED);
    if (rawClaim) {
      try { claimed = JSON.parse(rawClaim); } catch (e) { claimed = { code: rawClaim }; }
      if (!claimed || typeof claimed !== 'object') claimed = { code: rawClaim };
      if (claimed.expiresAt && Date.parse(claimed.expiresAt) < Date.now()) return;
    }
    if (!claimed && attemptsUsed >= maxAttempts) return;
  }
  var dismissed = !testMode && !!session.get(KEY_DISMISSED);

  // ---------- language ----------
  // The app publishes fully resolved strings per language (defaults + merchant overrides).
  var all = popup.strings || {};
  var htmlLang = (document.documentElement.lang || (window.Shopify && window.Shopify.locale) || 'en').toLowerCase();
  var lang = Object.keys(all).filter(function (k) { return htmlLang.indexOf(k) === 0; })[0] || 'en';
  var t = all[lang] || all.en;
  if (!t) return;

  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }

  // ---------- network (via app proxy, same origin) ----------
  function post(path, body) {
    return fetch(ctx.proxy + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify(Object.assign({ popupId: popup.id, v: popup.v }, body))
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
  }
  function track(type) {
    if (testMode) return;
    post('/track', { type: type }).catch(function () {});
  }

  // Fallback if the app proxy is unreachable (lives in gd-fx.js to keep this file small).
  function contactFallback(name, email, consent) {
    return window.GameDiscountFx ? window.GameDiscountFx.contact(name, email, consent) : Promise.resolve();
  }

  // ---------- DOM ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  var overlay = el('div', { class: 'gd-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gd-intro-title', hidden: '' });
  // Colors and size (--gd-sd desktop, --gd-sm phone) arrive as ready-made inline CSS;
  // configs published before that only have the two colors.
  var css = popup.css || '--gd-primary:' + popup.primaryColor + ';--gd-accent:' + popup.accentColor;
  overlay.style.cssText = css;

  var closeBtn = el('button', { class: 'gd-close', type: 'button', 'aria-label': t.closeBtn, text: '✕' });

  // Screen 1: intro
  var startBtn = el('button', { class: 'gd-btn', type: 'button', text: t.startBtn });
  var intro = el('div', { class: 'gd-screen' }, [
    el('h2', { class: 'gd-title', id: 'gd-intro-title', text: t.introTitle }),
    el('p', { class: 'gd-muted', text: fmt(t.introDesc, { seconds: popup.surviveSec }) }),
    startBtn
  ]);

  // Screen 2: form
  var nameInput = el('input', { class: 'gd-input', type: 'text', name: 'name', autocomplete: 'given-name', placeholder: t.namePlaceholder, 'aria-label': t.namePlaceholder, maxlength: '100' });
  var emailInput = el('input', { class: 'gd-input', type: 'email', name: 'email', autocomplete: 'email', inputmode: 'email', placeholder: t.emailPlaceholder, 'aria-label': t.emailPlaceholder, maxlength: '254' });
  var consentInput = el('input', { type: 'checkbox', name: 'consent' });
  var consentLabel = el('label', { class: 'gd-consent' }, [consentInput, el('span', { text: t.consentLabel })]);
  var formError = el('p', { class: 'gd-error', role: 'alert' });
  var submitBtn = el('button', { class: 'gd-btn', type: 'submit', text: t.formSubmit });
  var form = el('form', { class: 'gd-screen', novalidate: '', hidden: '' }, [
    el('h3', { class: 'gd-subtitle', text: t.formTitle }),
    nameInput, emailInput, consentLabel, formError, submitBtn
  ]);

  // Screen 3: game
  var gameType = popup.gameType === 'flipper' ? 'flipper' : 'paddle';
  var canvas = el('canvas', { class: 'gd-canvas', 'aria-label': t.playing });
  var timerEl = el('div', { class: 'gd-timer', text: Number(popup.surviveSec).toFixed(1) + 's' });
  var statusEl = el('p', { class: 'gd-status', 'aria-live': 'polite' });
  var retryBtn = el('button', { class: 'gd-btn-ghost', type: 'button', hidden: '' });
  var game = el('div', { class: 'gd-screen', hidden: '' }, [
    el('div', { class: 'gd-game-wrap gd-g-' + gameType }, [timerEl, canvas]),
    statusEl, retryBtn
  ]);

  // Screen 4: reward
  var rewardIntro = el('p', { class: 'gd-muted' });
  var valueEl = el('p', { class: 'gd-value', hidden: '' });
  var codeEl = el('span', { class: 'gd-code', text: '…' });
  var expiryEl = el('p', { class: 'gd-expiry', hidden: '' });
  var copyBtn = el('button', { class: 'gd-btn', type: 'button', text: t.copyBtn });
  var closeReward = el('button', { class: 'gd-btn-ghost', type: 'button', text: t.closeBtn });
  var reward = el('div', { class: 'gd-screen', hidden: '' }, [
    rewardIntro, valueEl, codeEl, expiryEl,
    el('p', { class: 'gd-muted', text: t.rewardTeaser }),
    el('div', { class: 'gd-reward-actions' }, [copyBtn, closeReward])
  ]);

  var cardChildren = [closeBtn, intro, form, game, reward];
  // Free plan: Shopify's standard app attribution, a small (max 24×24 px) icon link.
  if (cfg.branding) {
    cardChildren.push(el('a', { class: 'gd-branding', href: 'https://apps.shopify.com/', target: '_blank', rel: 'noopener', 'aria-label': 'Enigma Play', title: 'Enigma Play' }));
  }
  overlay.appendChild(el('div', { class: 'gd-card' }, cardChildren));
  if (!popup.requireConsent) consentLabel.hidden = true;

  function show(screen) {
    [intro, form, game, reward].forEach(function (s) { s.hidden = s !== screen; });
  }

  // ---------- open / close ----------
  var prevOverflow = '';
  var lastFocus = null;
  var opened = false;
  function open() {
    if (!overlay.hidden && overlay.parentNode) return;
    lastFocus = document.activeElement;
    document.body.appendChild(overlay);
    overlay.hidden = false;
    teaser.hidden = true;
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { overlay.classList.add('gd-open'); });
    (claimed ? copyBtn : startBtn).focus({ preventScroll: true });
    if (!opened) { opened = true; track('view'); loadGame(); }
  }
  function close() {
    // Closing mid-game counts as a lost attempt; the retry button waits on reopen.
    if (running) { stopGame(); lose(); } else stopGame();
    overlay.classList.remove('gd-open');
    overlay.hidden = true;
    document.documentElement.style.overflow = prevOverflow;
    session.set(KEY_DISMISSED, '1');
    showTeaser();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  closeBtn.addEventListener('click', close);
  closeReward.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay && !running) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) close(); });

  // Floating button: reopen the game, or remind the winner of their code.
  var teaserLabel = el('span');
  var teaserX = el('span', { class: 'gd-teaser-x', role: 'button', 'aria-label': t.closeBtn, text: '✕' });
  var teaser = el('button', { class: 'gd-teaser', type: 'button', hidden: '' }, [teaserLabel, teaserX]);
  teaser.style.cssText = css;
  teaser.addEventListener('click', function (e) {
    if (e.target === teaserX) { teaser.hidden = true; session.set(KEY_TEASER_OFF, '1'); return; }
    open();
  });
  function showTeaser() {
    if (!popup.teaser || session.get(KEY_TEASER_OFF)) return;
    if (!claimed && attemptsUsed >= maxAttempts) return;
    if (!teaser.parentNode) document.body.appendChild(teaser);
    teaser.hidden = false;
    renderTeaser();
  }
  function renderTeaser() {
    teaserLabel.textContent = claimed ? '🎁 ' + claimed.code + (claimed.expiresAt ? ' · ' + remaining(claimed.expiresAt) : '') : t.teaser;
  }

  // ---------- countdown ----------
  function remaining(iso) {
    var ms = Math.max(0, Date.parse(iso) - Date.now());
    var m = Math.floor(ms / 60000), sec = Math.floor(ms / 1000) % 60;
    return m >= 120 ? '' : m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  setInterval(function () {
    if (!claimed || !claimed.expiresAt) return;
    var left = remaining(claimed.expiresAt);
    if (left) expiryEl.textContent = fmt(t.expiresIn, { time: left });
    if (!teaser.hidden) renderTeaser();
    if (Date.parse(claimed.expiresAt) < Date.now()) teaser.hidden = true;
  }, 1000);

  function renderReward() {
    codeEl.textContent = claimed.code;
    valueEl.hidden = !claimed.value;
    if (claimed.value) valueEl.textContent = fmt(t.rewardValue, { value: claimed.value });
    expiryEl.hidden = !claimed.expiresAt;
    if (claimed.expiresAt) {
      var left = remaining(claimed.expiresAt);
      expiryEl.textContent = left
        ? fmt(t.expiresIn, { time: left })
        : fmt(t.validUntil, { date: new Date(claimed.expiresAt).toLocaleDateString(document.documentElement.lang || undefined) });
    }
  }

  // ---------- flow ----------
  var player = { name: '', email: '' };
  // Resolves to the claim token issued by /subscribe (null if unavailable).
  var tokenPromise = Promise.resolve(null);

  startBtn.addEventListener('click', function () { show(form); nameInput.focus(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    var email = emailInput.value.trim();
    if (!name) { formError.textContent = t.nameError; nameInput.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { formError.textContent = t.emailError; emailInput.focus(); return; }
    if (popup.requireConsent && !consentInput.checked) { formError.textContent = t.consentError; return; }
    formError.textContent = '';
    player.name = name;
    player.email = email;
    submitBtn.disabled = true;

    var consent = consentInput.checked;
    var proceed = function () { submitBtn.disabled = false; show(game); startGame(); };
    if (testMode) return proceed();
    // Don't make the visitor wait on the network for more than ~2.5s.
    var done = false;
    var timeout = setTimeout(function () { if (!done) { done = true; proceed(); } }, 2500);
    tokenPromise = post('/subscribe', { name: name, email: email, consent: consent })
      .then(function (res) {
        var token = (res && res.token) || null;
        if (!res || !res.ok) return contactFallback(name, email, consent).then(function () { return token; });
        return token;
      }, function () { return contactFallback(name, email, consent).then(function () { return null; }); });
    tokenPromise.then(function () { if (!done) { done = true; clearTimeout(timeout); proceed(); } });
  });

  retryBtn.addEventListener('click', function () { retryBtn.hidden = true; startGame(); });

  copyBtn.addEventListener('click', function () {
    var code = codeEl.textContent;
    var ok = function () { copyBtn.textContent = t.copied; setTimeout(function () { copyBtn.textContent = t.copyBtn; }, 2000); };
    // Without clipboard access, select the code so it can be copied by hand (gd-fx.js).
    var sel = function () { if (window.GameDiscountFx) window.GameDiscountFx.select(codeEl); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, sel);
    else sel();
  });

  function win() {
    local.set(KEY_ATTEMPTS, String(maxAttempts)); // no replays after a win
    var tier = Math.min(3, attemptsUsed);          // 1 = won on the first attempt
    rewardIntro.textContent = fmt(t.rewardIntro, { name: player.name });
    show(reward);
    if (window.GameDiscountFx) window.GameDiscountFx.confetti(overlay, [popup.accentColor, popup.primaryColor, '#fff', '#f5b400']);
    var reveal = function (res) {
      if (!res || !res.ok || !res.code) {
        // Claim failed (network / server). Let them come back and try again;
        // the same email gets the same claim token, so no duplicate codes.
        codeEl.textContent = '—';
        if (!testMode) local.set(KEY_ATTEMPTS, '0');
        return;
      }
      claimed = { code: res.code, value: res.value || null, expiresAt: res.expiresAt || null };
      renderReward();
      if (!testMode) local.set(KEY_CLAIMED, JSON.stringify(claimed));
      if (popup.autoApply && !testMode) {
        // Sets the discount cookie so the code is pre-applied at checkout.
        fetch('/discount/' + encodeURIComponent(claimed.code), { redirect: 'manual', credentials: 'same-origin' }).catch(function () {});
      }
      copyBtn.focus({ preventScroll: true });
    };
    // A slow /subscribe may still be in flight — wait for its token.
    tokenPromise
      .then(function (token) { return post('/claim', { test: testMode, token: token, tier: tier }); })
      .then(reveal, function () { reveal(null); });
  }

  // ---------- game (module loaded on demand from the theme extension assets) ----------
  var surviveMs = Math.max(3, Number(popup.surviveSec) || 15) * 1000;
  var running = false, engine = null, gameReady = null;
  function loadGame() {
    if (gameReady) return gameReady;
    var assets = ctx.assets || {};
    if (!window.GameDiscountFx && assets.fx) script(assets.fx).catch(function () {}); // confetti is optional
    gameReady = ((window.GameDiscountGames || {})[gameType] ? Promise.resolve() : script(assets[gameType])).then(function () {
      engine = window.GameDiscountGames[gameType](canvas, {
        primary: popup.primaryColor, accent: popup.accentColor, vx: popup.vx, vy: popup.vy, surviveMs: surviveMs
      });
    });
    return gameReady;
  }

  function script(src) {
    return new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = src; sc.async = true; sc.onload = resolve; sc.onerror = reject;
      document.head.appendChild(sc);
    });
  }

  function startGame() {
    attemptsUsed += 1;
    if (!testMode) local.set(KEY_ATTEMPTS, String(attemptsUsed));
    track('play');
    statusEl.textContent = gameType === 'flipper' ? t.flipperHelp : t.playing;
    timerEl.textContent = (surviveMs / 1000).toFixed(1) + 's';
    loadGame().then(function () {
      running = true;
      engine.start({
        tick: function (ms) { timerEl.textContent = (ms / 1000).toFixed(1) + 's'; },
        end: function (won) { running = false; if (won) win(); else lose(); }
      });
    }, function () { statusEl.textContent = '—'; });
  }
  function stopGame() { running = false; if (engine) engine.stop(); }

  function lose() {
    var remaining = maxAttempts - attemptsUsed;
    if (remaining > 0) {
      statusEl.textContent = t.fail;
      retryBtn.textContent = fmt(t.retriesLeft, { n: remaining });
      retryBtn.hidden = false;
      retryBtn.focus({ preventScroll: true });
    } else {
      statusEl.textContent = t.fail + ' ' + t.noAttempts;
    }
  }

  // ---------- trigger ----------
  if (claimed) {
    // Winner on a later page: show their code in the floating button.
    renderReward();
    show(reward);
    rewardIntro.textContent = '';
    return showTeaser();
  }
  if (dismissed) return showTeaser();

  // Frequency cap for automatic opening (the floating button still works).
  var KEY_SHOWN = 'gd_shown_' + popup.id;
  var freq = popup.frequency || 'session';
  var capped = !testMode && (freq === 'session'
    ? session.get(KEY_SHOWN)
    : freq !== 'always' && Date.now() - (Number(local.get(KEY_SHOWN)) || 0) < (freq === 'day' ? 864e5 : 6048e5));
  if (capped) return showTeaser();

  var fired = false;
  function fire() {
    if (fired) return;
    fired = true;
    session.set(KEY_SHOWN, '1');
    local.set(KEY_SHOWN, String(Date.now()));
    open();
  }
  var mode = testMode ? 'delay' : popup.trigger || 'both';
  // Exit intent needs a mouse; touch devices always use the delay.
  var hasMouse = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (mode !== 'delay' && hasMouse) {
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && e.clientY <= 0) fire();
    });
  }
  if (mode !== 'exit' || !hasMouse) {
    setTimeout(fire, testMode ? 500 : Math.max(0, Number(popup.delaySec) || 0) * 1000);
  }
})();
