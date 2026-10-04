/* Enigma Play – pong against the computer. Loaded on demand by game-popup.js.
 * Contract: factory(canvas, opts) -> { start({ tick(label), end(won) }), stop() }
 * Goal: score 3 goals before the computer does.
 * The game runs in "field" coordinates: x along the field (player at x≈0,
 * computer at x≈L), y across it. Desktop draws it landscape (player left);
 * phones draw it portrait (player at the bottom) so it fits a tall screen. */
(function () {
  'use strict';
  var L = 360, Wd = 220;                 // field length and width
  var PW = 8, PL = 48, GAP = 14, R = 5;  // paddle thickness/length, distance from goal line, ball radius
  var GOALS = 3;
  // Computer per level: paddle speed (px per 60 fps frame) and the chance that
  // it misjudges a return. Tuned with a simulated player so that an average
  // player wins a medium match in a minute or two.
  var LEVELS = { easy: [2.8, 0.3], medium: [3.6, 0.17], hard: [4.6, 0.09] };

  (window.GameDiscountGames = window.GameDiscountGames || {}).pong = function (canvas, o) {
    var portrait = window.matchMedia ? matchMedia('(max-width: 640px)').matches : false;
    var cw = portrait ? Wd : L, ch = portrait ? L : Wd;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    var c = canvas.getContext('2d');
    var level = LEVELS[o.difficulty] || LEVELS.medium;

    var running = false, raf = 0, last = 0, acc = 0, pause = 0, cb = null;
    var STEP = 1000 / 120, K = STEP / (1000 / 60);
    var me = { y: Wd / 2 }, cpu = { y: Wd / 2, aim: 0 };
    var ball = { x: 0, y: 0, vx: 0, vy: 0 };
    var score = [0, 0], keys = {};

    // Pointer/finger anywhere on the screen steers the player's paddle; the
    // popup must not scroll or zoom meanwhile (same as the paddle game).
    var lockEls = [canvas.closest('.gd-card'), canvas.closest('.gd-overlay')].filter(Boolean);
    function lock(on) { lockEls.forEach(function (el) { el.style.touchAction = on ? 'none' : ''; }); }
    function steer(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      me.y = portrait ? ((clientX - r.left) / r.width) * Wd : ((clientY - r.top) / r.height) * Wd;
      clamp(me);
    }
    function clamp(p) { p.y = Math.max(PL / 2, Math.min(Wd - PL / 2, p.y)); }
    document.addEventListener('pointermove', function (e) { if (running) steer(e.clientX, e.clientY); });
    document.addEventListener('pointerdown', function (e) { if (running) steer(e.clientX, e.clientY); });
    function onTouch(e) {
      if (!running || !e.touches[0] || (e.target.closest && e.target.closest('button'))) return;
      e.preventDefault();
      steer(e.touches[0].clientX, e.touches[0].clientY);
    }
    document.addEventListener('touchstart', onTouch, { passive: false });
    document.addEventListener('touchmove', onTouch, { passive: false });
    var KEYS = portrait ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
    document.addEventListener('keydown', function (e) {
      if (running && KEYS[e.key]) { keys[e.key] = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', function (e) { keys[e.key] = false; });

    function serve(towardsPlayer) {
      ball.x = L / 2; ball.y = Wd / 2;
      var speed = 3.6, angle = (Math.random() * 0.8 - 0.4);
      ball.vx = (towardsPlayer ? -1 : 1) * speed * Math.cos(angle);
      ball.vy = speed * Math.sin(angle);
      aimCpu();
      pause = 700;
    }

    // Where the computer aims on this return: slightly off, or (sometimes) clearly wrong.
    function aimCpu() {
      var side = Math.random() < 0.5 ? -1 : 1;
      cpu.aim = Math.random() < level[1] ? side * (PL / 2 + R + 4 + Math.random() * 10) : side * Math.random() * 12;
    }

    function hit(p, dir) {
      // Bounce off a paddle; where it hits decides the angle, and every hit is a bit faster.
      var off = Math.max(-1, Math.min(1, (ball.y - p.y) / (PL / 2)));
      var speed = Math.min(8, Math.hypot(ball.vx, ball.vy) * 1.05);
      var angle = off * 1.0;
      ball.vx = dir * speed * Math.cos(angle);
      ball.vy = speed * Math.sin(angle);
      if (dir > 0) aimCpu();
    }

    function step() {
      for (var key in KEYS) if (keys[key]) { me.y += KEYS[key] * 6 * K; clamp(me); }
      // Computer: follows the ball while it comes towards it, else drifts back to the middle.
      var target = ball.vx > 0 ? ball.y + cpu.aim : Wd / 2;
      var d = target - cpu.y, max = level[0] * K;
      cpu.y += Math.max(-max, Math.min(max, d));
      clamp(cpu);
      if (pause > 0) { pause -= STEP; return; }

      ball.x += ball.vx * K; ball.y += ball.vy * K;
      if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }
      if (ball.y > Wd - R) { ball.y = Wd - R; ball.vy = -Math.abs(ball.vy); }

      var meX = GAP + PW, cpuX = L - GAP - PW;
      if (ball.vx < 0 && ball.x - R <= meX && ball.x - R >= GAP - 6 && Math.abs(ball.y - me.y) <= PL / 2 + R) {
        ball.x = meX + R; hit(me, 1);
      } else if (ball.vx > 0 && ball.x + R >= cpuX && ball.x + R <= L - GAP + 6 && Math.abs(ball.y - cpu.y) <= PL / 2 + R) {
        ball.x = cpuX - R; hit(cpu, -1);
      }

      if (ball.x < -R || ball.x > L + R) {
        var playerScored = ball.x > L;
        score[playerScored ? 0 : 1] += 1;
        cb.tick(score[0] + ' : ' + score[1]);
        if (score[0] >= GOALS || score[1] >= GOALS) return finish(score[0] >= GOALS);
        serve(playerScored);
      }
    }

    function finish(won) { running = false; lock(false); draw(); cb.end(won); }

    function rect(x, y, w, h) {
      // Field → canvas: portrait turns the field so the player is at the bottom.
      if (portrait) c.fillRect(y, L - x - w, h, w); else c.fillRect(x, y, w, h);
    }

    function draw() {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#11151c'; c.fillRect(0, 0, cw, ch);
      // big faded score and the center line
      c.fillStyle = 'rgba(255,255,255,0.10)';
      c.font = 'bold 64px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (portrait) { c.fillText(score[1], cw / 2, ch / 4); c.fillText(score[0], cw / 2, ch * 3 / 4); }
      else { c.fillText(score[0], cw / 4, ch / 2); c.fillText(score[1], cw * 3 / 4, ch / 2); }
      c.fillStyle = 'rgba(255,255,255,0.18)';
      for (var i = 4; i < Wd; i += 14) rect(L / 2 - 1, i, 2, 7);
      c.fillStyle = o.accentColor || '#d9caa0';
      rect(GAP, me.y - PL / 2, PW, PL);
      c.fillStyle = 'rgba(232,236,241,0.75)';
      rect(L - GAP - PW, cpu.y - PL / 2, PW, PL);
      c.fillStyle = '#fff';
      rect(ball.x - R, ball.y - R, R * 2, R * 2);
    }

    function tick(now) {
      if (!running) return;
      // rAF time can precede the start time; cap so a background tab can't teleport the ball.
      acc += Math.max(0, Math.min(now - last, 50));
      last = now;
      while (acc >= STEP && running) { step(); acc -= STEP; }
      if (!running) return;
      draw();
      raf = requestAnimationFrame(tick);
    }

    return {
      start: function (callbacks) {
        cb = callbacks;
        score = [0, 0]; me.y = cpu.y = Wd / 2; acc = 0; keys = {};
        serve(Math.random() < 0.5);
        cb.tick('0 : 0');
        running = true; lock(true); last = performance.now();
        draw();
        raf = requestAnimationFrame(tick);
      },
      stop: function () { running = false; lock(false); cancelAnimationFrame(raf); }
    };
  };
})();
