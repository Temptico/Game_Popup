/* GameDiscount – gamification popup (storefront). Settings: app.metafields.gamediscount.config
 * Source file. `npm run build:storefront` minifies it into
 * extensions/gamediscount-popup/assets/game-popup.js — edit here, not there. */
(function () {
  'use strict';
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
  var KEY_CLAIMED = 'gd_claimed_' + popup.id;
  var KEY_ATTEMPTS = 'gd_attempts_' + popup.id;
  var KEY_DISMISSED = 'gd_dismissed_' + popup.id;

  var maxAttempts = Math.max(1, popup.maxAttempts | 0);
  var attemptsUsed = testMode ? 0 : parseInt(local.get(KEY_ATTEMPTS) || '0', 10) || 0;

  if (!testMode) {
    if (local.get(KEY_CLAIMED)) return;
    if (attemptsUsed >= maxAttempts) return;
    if (session.get(KEY_DISMISSED)) return;
  }

  // ---------- language ----------
  // The app publishes fully resolved strings per language (defaults + merchant overrides).
  var all = popup.strings || {};
  var htmlLang = (document.documentElement.lang || (window.Shopify && window.Shopify.locale) || 'en').toLowerCase();
  var lang = Object.keys(all).filter(function (k) { return htmlLang.indexOf(k) === 0; })[0] || 'en';
  var t = all[lang] || all.en;
  if (!t) return;

  function fmt(str, vars) {
    return String(str)
      .replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; })
      .replace(/\[ime\]/g, vars.name != null ? vars.name : '[ime]') // legacy placeholders
      .replace(/#/g, vars.n != null ? vars.n : '#');
  }

  // ---------- network (via app proxy, same origin) ----------
  function post(path, body) {
    return fetch(ctx.proxy + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify(Object.assign({ popupId: popup.id }, body))
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
  }
  function track(type) {
    if (testMode) return;
    post('/track', { type: type }).catch(function () {});
  }

  // Fallback if the app proxy is unreachable: store email as a newsletter
  // contact through the theme's own customer form, without reloading the page.
  function contactFallback(name, email, consent) {
    var fd = new FormData();
    fd.append('form_type', 'customer');
    fd.append('utf8', '✓');
    fd.append('contact[email]', email);
    fd.append('contact[first_name]', name);
    fd.append('contact[tags]', consent ? 'gamediscount,newsletter' : 'gamediscount');
    if (consent) fd.append('contact[accepts_marketing]', 'true');
    return fetch('/contact', { method: 'POST', body: fd, redirect: 'manual', credentials: 'same-origin' }).catch(function () {});
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
  overlay.style.setProperty('--gd-primary', popup.primaryColor || '#830522');
  overlay.style.setProperty('--gd-accent', popup.accentColor || '#d9caa0');

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
  var W = 356, H = 220;
  var canvas = el('canvas', { class: 'gd-canvas', width: String(W), height: String(H), 'aria-label': t.playing });
  var timerEl = el('div', { class: 'gd-timer', text: Number(popup.surviveSec).toFixed(1) + 's' });
  var statusEl = el('p', { class: 'gd-status', 'aria-live': 'polite' });
  var retryBtn = el('button', { class: 'gd-btn-ghost', type: 'button', hidden: '' });
  var game = el('div', { class: 'gd-screen', hidden: '' }, [
    el('div', { class: 'gd-game-wrap' }, [timerEl, canvas]),
    statusEl, retryBtn
  ]);

  // Screen 4: reward
  var rewardIntro = el('p', { class: 'gd-muted' });
  var codeEl = el('span', { class: 'gd-code', text: '······' });
  var copyBtn = el('button', { class: 'gd-btn', type: 'button', text: t.copyBtn });
  var closeReward = el('button', { class: 'gd-btn-ghost', type: 'button', text: t.closeBtn });
  var reward = el('div', { class: 'gd-screen', hidden: '' }, [
    rewardIntro, codeEl,
    el('p', { class: 'gd-muted', text: t.rewardTeaser }),
    el('div', { class: 'gd-reward-actions' }, [copyBtn, closeReward])
  ]);

  var cardChildren = [closeBtn, intro, form, game, reward];
  if (cfg.branding) {
    var brand = el('p', { class: 'gd-branding' }, [
      document.createTextNode('Powered by '),
      el('a', { href: 'https://apps.shopify.com/', target: '_blank', rel: 'noopener', text: 'GameDiscount' })
    ]);
    cardChildren.push(brand);
  }
  overlay.appendChild(el('div', { class: 'gd-card' }, cardChildren));
  if (!popup.requireConsent) consentLabel.hidden = true;

  function show(screen) {
    [intro, form, game, reward].forEach(function (s) { s.hidden = s !== screen; });
  }

  // ---------- open / close ----------
  var prevOverflow = '';
  var lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    document.body.appendChild(overlay);
    overlay.hidden = false;
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { overlay.classList.add('gd-open'); });
    startBtn.focus({ preventScroll: true });
    track('view');
  }
  function close() {
    stopGame();
    overlay.classList.remove('gd-open');
    overlay.hidden = true;
    document.documentElement.style.overflow = prevOverflow;
    session.set(KEY_DISMISSED, '1');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  closeBtn.addEventListener('click', close);
  closeReward.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay && !running) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) close(); });

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
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(ok, function () { selectCode(); });
    } else { selectCode(); }
  });
  function selectCode() {
    var r = document.createRange(); r.selectNodeContents(codeEl);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  function win() {
    local.set(KEY_ATTEMPTS, String(maxAttempts)); // no replays after a win
    rewardIntro.textContent = fmt(t.rewardIntro, { name: player.name });
    show(reward);
    var reveal = function (code) {
      codeEl.textContent = code;
      if (code === '—') {
        // Claim failed (network / server). Let them come back and try again;
        // the same email gets the same claim token, so no duplicate codes.
        if (!testMode) local.set(KEY_ATTEMPTS, '0');
        return;
      }
      if (!testMode) local.set(KEY_CLAIMED, code);
      if (popup.autoApply && !testMode) {
        // Sets the discount cookie so the code is pre-applied at checkout.
        fetch('/discount/' + encodeURIComponent(code), { redirect: 'manual', credentials: 'same-origin' }).catch(function () {});
      }
      copyBtn.focus({ preventScroll: true });
    };
    // A slow /subscribe may still be in flight — wait for its token.
    tokenPromise
      .then(function (token) { return post('/claim', { test: testMode, token: token }); })
      .then(function (res) {
        reveal(res && res.ok && res.code ? res.code : '—');
      }, function () { reveal('—'); });
  }

  // ---------- game ----------
  var c2d = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  c2d.scale(dpr, dpr);

  var PADDLE_W = 72, PADDLE_H = 10, PADDLE_Y = H - 18, R = 7;
  var baseVx = Math.abs(Number(popup.vx) || 4.5);
  var baseVy = Math.abs(Number(popup.vy) || 5);
  var startDir = (Number(popup.vy) || -5) < 0 ? -1 : 1;
  var surviveMs = Math.max(3, Number(popup.surviveSec) || 15) * 1000;

  var running = false, raf = 0, last = 0, elapsed = 0;
  var ball = { x: 0, y: 0, vx: 0, vy: 0 };
  var paddleX = (W - PADDLE_W) / 2;
  var keys = { left: false, right: false };

  function setPaddleFromClient(clientX) {
    var rect = canvas.getBoundingClientRect();
    var x = ((clientX - rect.left) / rect.width) * W;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
  }
  canvas.addEventListener('pointermove', function (e) { setPaddleFromClient(e.clientX); });
  canvas.addEventListener('pointerdown', function (e) {
    setPaddleFromClient(e.clientX);
    if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
  });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', function (e) {
    if (!running) return;
    if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
    if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
  });

  function draw() {
    var cs = getComputedStyle(overlay);
    var primary = cs.getPropertyValue('--gd-primary').trim() || '#830522';
    c2d.clearRect(0, 0, W, H);
    c2d.fillStyle = primary;
    roundRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 5);
    c2d.fillStyle = '#11151c';
    c2d.beginPath(); c2d.arc(ball.x, ball.y, R, 0, Math.PI * 2); c2d.fill();
  }
  function roundRect(x, y, w, h, r) {
    c2d.beginPath();
    c2d.moveTo(x + r, y);
    c2d.arcTo(x + w, y, x + w, y + h, r);
    c2d.arcTo(x + w, y + h, x, y + h, r);
    c2d.arcTo(x, y + h, x, y, r);
    c2d.arcTo(x, y, x + w, y, r);
    c2d.closePath(); c2d.fill();
  }

  function startGame() {
    attemptsUsed += 1;
    if (!testMode) local.set(KEY_ATTEMPTS, String(attemptsUsed));
    track('play');
    ball.x = W / 2; ball.y = H * 0.45;
    ball.vx = (Math.random() < 0.5 ? -1 : 1) * baseVx;
    ball.vy = startDir * baseVy;
    paddleX = (W - PADDLE_W) / 2;
    elapsed = 0;
    statusEl.textContent = t.playing;
    timerEl.textContent = (surviveMs / 1000).toFixed(1) + 's';
    running = true;
    last = performance.now();
    draw();
    raf = requestAnimationFrame(tick);
  }
  function stopGame() { running = false; cancelAnimationFrame(raf); }

  function tick(now) {
    if (!running) return;
    // Normalize to 60 fps; cap dt so a background tab can't teleport the ball.
    var dt = Math.min((now - last) / (1000 / 60), 3);
    last = now;
    elapsed += dt * (1000 / 60);

    if (keys.left) paddleX = Math.max(0, paddleX - 7 * dt);
    if (keys.right) paddleX = Math.min(W - PADDLE_W, paddleX + 7 * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - R < 0) { ball.x = R; ball.vx = Math.abs(ball.vx); }
    if (ball.x + R > W) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - R < 0) { ball.y = R; ball.vy = Math.abs(ball.vy); }

    // Paddle hit: bounce up, angle depends on where the ball hits the paddle.
    if (ball.vy > 0 && ball.y + R >= PADDLE_Y && ball.y + R <= PADDLE_Y + PADDLE_H + Math.abs(ball.vy) * dt + 1 &&
        ball.x + R >= paddleX && ball.x - R <= paddleX + PADDLE_W) {
      ball.y = PADDLE_Y - R;
      ball.vy = -baseVy;
      var offset = (ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2); // -1..1
      var dir = Math.abs(offset) < 0.05 ? (ball.vx < 0 ? -1 : 1) : (offset < 0 ? -1 : 1);
      ball.vx = dir * baseVx * (0.6 + 0.8 * Math.min(1, Math.abs(offset)));
    }

    var left = Math.max(0, surviveMs - elapsed);
    timerEl.textContent = (left / 1000).toFixed(1) + 's';
    draw();

    if (ball.y - R > H) return lose();
    if (left <= 0) { stopGame(); return win(); }
    raf = requestAnimationFrame(tick);
  }

  function lose() {
    stopGame();
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
  var delay = testMode ? 500 : Math.max(0, Number(popup.delaySec) || 0) * 1000;
  setTimeout(open, delay);
})();
