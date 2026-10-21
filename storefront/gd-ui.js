/* Enigma Play – popup UI: screens, form, game flow, reward and the floating button.
 * Loaded by game-popup.js only when something is shown, so the script on every page stays small.
 * Source file; `npm run build:storefront` minifies it into the theme extension assets. */
(function () {
  window.GameDiscountUI = function (S) {
    var popup = S.popup, cfg = S.cfg, ctx = S.ctx, t = S.t, locale = S.locale, testMode = S.testMode;
    var local = S.local, session = S.session, post = S.post, track = S.track, script = S.script;
    var claimed = S.claimed, attemptsUsed = S.attemptsUsed, maxAttempts = S.maxAttempts;
    var KEY_CLAIMED = S.keys.claimed, KEY_ATTEMPTS = S.keys.attempts, KEY_DISMISSED = S.keys.dismissed, KEY_TEASER_OFF = S.keys.teaserOff;

    function fmt(str, vars) {
      return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
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
    // Colors and size (--gd-sd desktop, --gd-sm phone) arrive as ready-made inline CSS.
    var css = popup.css;
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
    var gameType = /^(flipper|pong)$/.test(popup.gameType) ? popup.gameType : 'paddle';
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
      cardChildren.push(el('a', { class: 'gd-branding', href: 'https://apps.shopify.com/game-discount', target: '_blank', rel: 'noopener', 'aria-label': 'Enigma Play', title: 'Enigma Play' }));
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
          : fmt(t.validUntil, { date: new Date(claimed.expiresAt).toLocaleDateString(locale) });
      }
    }

    // ---------- flow ----------
    var player = { name: '', email: '' };
    // Resolves to the claim token issued by /subscribe (null if unavailable).
    var tokenPromise = Promise.resolve(null);

    // Name field: required (default), "o" optional or "h" hidden.
    var nameMode = popup.name;
    nameInput.hidden = nameMode == 'h';
    // "start" (first click per page) shows where visitors drop off: before or in the form.
    var started;
    startBtn.addEventListener('click', function () {
      show(form);
      (nameInput.hidden ? emailInput : nameInput).focus();
      if (!started) { started = 1; track('start'); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = nameInput.value.trim();
      var email = emailInput.value.trim();
      if (!name && !nameMode) { formError.textContent = t.nameError; nameInput.focus(); return; }
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
      tokenPromise = post('/subscribe', { name: name, email: email, consent: consent, locale: locale })
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
        // Games read what they need from the popup settings (colors, speeds, difficulty).
        engine = window.GameDiscountGames[gameType](canvas, Object.assign({ surviveMs: surviveMs }, popup));
      });
      return gameReady;
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
          // Time left in ms, or a ready label (pong shows the score).
          tick: function (v) { timerEl.textContent = v.toFixed ? (v / 1000).toFixed(1) + 's' : v; },
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


    return {
      open: open,
      teaser: showTeaser,
      // Winner on a later page: their code in the floating button (and the popup).
      winner: function () { renderReward(); show(reward); rewardIntro.textContent = ''; showTeaser(); }
    };
  };
})();
