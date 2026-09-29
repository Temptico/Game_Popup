/* GameDiscount – flipper (pinball) game. Loaded on demand by game-popup.js.
 * Contract: factory(canvas, opts) -> { start({ tick(msLeft), end(won) }), stop() }
 * Goal: keep the ball in play for surviveMs. Bumpers only add score/fun. */
(function () {
  'use strict';
  var W = 300, H = 420, R = 8;
  var G = 0.12;            // gravity, px/frame² at 60 fps
  var MAX_V = 10;          // speed clamp keeps the ball readable and avoids tunnelling
  var STEPS = 4;           // physics substeps per frame
  var FL = 48, FT = 6;     // flipper length / half-thickness
  var REST = 0.6, UP = -0.45;  // flipper angles (rad) relative to horizontal, left side
  var HOLD_MS = 900;       // flippers drop after this long, so cradling can't trivialise the game

  // Static walls as segments [x1, y1, x2, y2]
  var WALLS = [
    [0, 60, 60, 0], [W - 60, 0, W, 60],             // rounded top corners
    [0, 0, W, 0], [0, 0, 0, H], [W, 0, W, H],       // box
    [0, 300, 92, 364], [W, 300, W - 92, 364]        // inlanes feeding the flippers
  ];
  var BUMPERS = [
    { x: 85, y: 125, r: 18 }, { x: 215, y: 125, r: 18 }, { x: 150, y: 205, r: 20 }
  ];

  (window.GameDiscountGames = window.GameDiscountGames || {}).flipper = function (canvas, o) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    var c = canvas.getContext('2d');
    c.scale(dpr, dpr);

    var flippers = [
      { px: 92, py: 366, side: 1, a: REST, prev: REST, held: false, since: 0 },
      { px: W - 92, py: 366, side: -1, a: REST, prev: REST, held: false, since: 0 }
    ];
    var ball = { x: 0, y: 0, vx: 0, vy: 0 };
    var running = false, raf = 0, last = 0, elapsed = 0, score = 0, cb = null;
    var flash = [0, 0, 0];
    var pointers = {};
    var hover = -1; // which half the mouse is over (-1 = none)

    function press(i, on) {
      var f = flippers[i];
      if (on && !f.held) f.since = elapsed;
      f.held = on;
    }
    function sideOf(e) {
      var rect = canvas.getBoundingClientRect();
      return e.clientX - rect.left < rect.width / 2 ? 0 : 1;
    }
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      pointers[e.pointerId] = sideOf(e);
      press(pointers[e.pointerId], true);
    });
    function release(e) {
      if (pointers[e.pointerId] == null) return;
      var side = pointers[e.pointerId];
      delete pointers[e.pointerId];
      var still = Object.keys(pointers).some(function (k) { return pointers[k] === side; });
      if (!still) press(side, false);
    }
    canvas.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') hover = sideOf(e); });
    canvas.addEventListener('pointerleave', function () { hover = -1; });
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', release);
    var KEYS = { ArrowLeft: 0, a: 0, A: 0, z: 0, Z: 0, ArrowRight: 1, d: 1, D: 1, '/': 1, m: 1, M: 1 };
    document.addEventListener('keydown', function (e) {
      if (!running) return;
      if (e.key === ' ') { press(0, true); press(1, true); e.preventDefault(); return; }
      if (KEYS[e.key] != null) { if (!e.repeat) press(KEYS[e.key], true); e.preventDefault(); }
    });
    document.addEventListener('keyup', function (e) {
      if (e.key === ' ') { press(0, false); press(1, false); }
      if (KEYS[e.key] != null) press(KEYS[e.key], false);
    });

    // Flipper segment in world space: pivot -> tip.
    function tip(f) {
      return { x: f.px + f.side * FL * Math.cos(f.a), y: f.py + FL * Math.sin(f.a) };
    }

    // Collide the ball with segment (x1,y1)-(x2,y2) of half-thickness t.
    // (svx, svy) is the surface velocity at the contact point (moving flippers).
    function collideSeg(x1, y1, x2, y2, t, svx, svy, bounce) {
      var dx = x2 - x1, dy = y2 - y1;
      var len2 = dx * dx + dy * dy;
      var u = len2 ? ((ball.x - x1) * dx + (ball.y - y1) * dy) / len2 : 0;
      u = Math.max(0, Math.min(1, u));
      var cx = x1 + u * dx, cy = y1 + u * dy;
      var nx = ball.x - cx, ny = ball.y - cy;
      var d = Math.sqrt(nx * nx + ny * ny);
      var min = R + t;
      if (d >= min || d === 0) return -1;
      nx /= d; ny /= d;
      ball.x = cx + nx * min; ball.y = cy + ny * min;
      var rvx = ball.vx - svx, rvy = ball.vy - svy;
      var vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        ball.vx -= (1 + bounce) * vn * nx;
        ball.vy -= (1 + bounce) * vn * ny;
      }
      return u;
    }

    function step(dt) {
      ball.vy += G * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      for (var i = 0; i < WALLS.length; i++) {
        var w = WALLS[i];
        collideSeg(w[0], w[1], w[2], w[3], 0, 0, 0, 0.45);
      }

      for (var b = 0; b < BUMPERS.length; b++) {
        var p = BUMPERS[b];
        var nx = ball.x - p.x, ny = ball.y - p.y;
        var d = Math.sqrt(nx * nx + ny * ny);
        if (d < p.r + R && d > 0) {
          nx /= d; ny /= d;
          ball.x = p.x + nx * (p.r + R); ball.y = p.y + ny * (p.r + R);
          // Bumpers kick the ball away at a fixed, lively speed.
          ball.vx = nx * 8; ball.vy = ny * 8;
          score += 100; flash[b] = 12;
        }
      }

      for (var k = 0; k < 2; k++) {
        var f = flippers[k];
        var t = tip(f);
        var rx = t.x - f.px, ry = t.y - f.py;
        // Where along the flipper the ball would touch (0 = pivot, 1 = tip)…
        var u = ((ball.x - f.px) * rx + (ball.y - f.py) * ry) / (rx * rx + ry * ry);
        u = Math.max(0, Math.min(1, u));
        // …and the flipper's surface velocity there: d/da of pivot + u·FL·(side·cos a, sin a).
        var av = (f.a - f.prev) / Math.max(dt, 0.001);
        collideSeg(f.px, f.py, t.x, t.y, FT, -av * f.side * ry * u, av * f.side * rx * u, 0.3);
      }

      var sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (sp > MAX_V) { ball.vx *= MAX_V / sp; ball.vy *= MAX_V / sp; }
    }

    function draw() {
      var ink = '#f5eeea', accent = o.accent || '#d9caa0';
      c.clearRect(0, 0, W, H);
      // Left/right control halves: highlight the hovered or pressed side.
      for (var side = 0; side < 2; side++) {
        var on = flippers[side].held ? 0.16 : hover === side ? 0.07 : 0;
        if (on) { c.fillStyle = 'rgba(255,255,255,' + on + ')'; c.fillRect(side * W / 2, 0, W / 2, H); }
      }
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1;
      c.setLineDash([4, 6]);
      c.beginPath(); c.moveTo(W / 2, 250); c.lineTo(W / 2, H); c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.font = 'bold 18px sans-serif';
      c.textAlign = 'left'; c.fillText('◀', 10, H - 12);
      c.textAlign = 'right'; c.fillText('▶', W - 10, H - 12);

      c.lineCap = 'round';
      c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 3;
      for (var i = 0; i < WALLS.length; i++) {
        var w = WALLS[i];
        c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(w[2], w[3]); c.stroke();
      }
      for (var b = 0; b < BUMPERS.length; b++) {
        var p = BUMPERS[b];
        c.fillStyle = flash[b] > 0 ? accent : o.primary;
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = accent; c.lineWidth = 2;
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke();
        if (flash[b] > 0) flash[b]--;
      }
      c.strokeStyle = accent; c.lineWidth = FT * 2;
      for (var k = 0; k < 2; k++) {
        var f = flippers[k], t = tip(f);
        c.beginPath(); c.moveTo(f.px, f.py); c.lineTo(t.x, t.y); c.stroke();
      }
      c.fillStyle = ink;
      c.beginPath(); c.arc(ball.x, ball.y, R, 0, Math.PI * 2); c.fill();
      c.font = 'bold 14px monospace'; c.textAlign = 'right';
      c.fillText(String(score), W - 12, 24);
    }

    function tick(now) {
      if (!running) return;
      var dt = Math.min((now - last) / (1000 / 60), 3);
      last = now;
      elapsed += dt * (1000 / 60);

      for (var k = 0; k < 2; k++) {
        var f = flippers[k];
        if (f.held && elapsed - f.since > HOLD_MS) f.held = false;
        f.prev = f.a;
        var target = f.held ? UP : REST;
        var speed = (f.held ? 0.32 : 0.16) * dt;
        f.a += Math.max(-speed, Math.min(speed, target - f.a));
      }
      // Substeps: move flippers and ball in small increments for stable contacts.
      var sub = dt / STEPS;
      var from = [flippers[0].prev, flippers[1].prev], to = [flippers[0].a, flippers[1].a];
      for (var s = 1; s <= STEPS; s++) {
        for (var j = 0; j < 2; j++) {
          flippers[j].prev = from[j] + (to[j] - from[j]) * (s - 1) / STEPS;
          flippers[j].a = from[j] + (to[j] - from[j]) * s / STEPS;
        }
        step(sub);
      }

      var left = Math.max(0, o.surviveMs - elapsed);
      cb.tick(left);
      draw();
      if (ball.y - R > H) { running = false; return cb.end(false); }
      if (left <= 0) { running = false; return cb.end(true); }
      raf = requestAnimationFrame(tick);
    }

    return {
      start: function (callbacks) {
        cb = callbacks;
        ball.x = W / 2 + (Math.random() * 80 - 40); ball.y = 40;
        ball.vx = Math.random() * 4 - 2; ball.vy = 0;
        flippers.forEach(function (f) { f.a = f.prev = REST; f.held = false; });
        pointers = {};
        elapsed = 0; score = 0; running = true; last = performance.now();
        draw();
        raf = requestAnimationFrame(tick);
      },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      // Read-only snapshot for automated tests.
      peek: function () { return { ball: ball, flippers: flippers }; }
    };
  };
})();
