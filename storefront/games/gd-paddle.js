/* GameDiscount – paddle & ball game. Loaded on demand by game-popup.js.
 * Contract: factory(canvas, opts) -> { start({ tick(msLeft), end(won) }), stop() } */
(function () {
  'use strict';
  var W = 356, H = 220, PADDLE_W = 72, PADDLE_H = 10, PADDLE_Y = H - 18, R = 7;

  (window.GameDiscountGames = window.GameDiscountGames || {}).paddle = function (canvas, o) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    var c = canvas.getContext('2d');
    c.scale(dpr, dpr);

    var baseVx = Math.abs(Number(o.vx) || 4.5);
    var baseVy = Math.abs(Number(o.vy) || 5);
    var startDir = (Number(o.vy) || -5) < 0 ? -1 : 1;
    var running = false, raf = 0, last = 0, elapsed = 0, cb = null;
    var ball = { x: 0, y: 0, vx: 0, vy: 0 };
    var paddleX = (W - PADDLE_W) / 2;
    var keys = {};

    function setPaddle(clientX) {
      var rect = canvas.getBoundingClientRect();
      var x = ((clientX - rect.left) / rect.width) * W;
      paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    }
    canvas.addEventListener('pointermove', function (e) { setPaddle(e.clientX); });
    canvas.addEventListener('pointerdown', function (e) {
      setPaddle(e.clientX);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    document.addEventListener('keydown', function (e) {
      if (running && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { keys[e.key] = true; e.preventDefault(); }
    });
    document.addEventListener('keyup', function (e) { keys[e.key] = false; });

    function draw() {
      c.clearRect(0, 0, W, H);
      c.fillStyle = o.primary;
      c.beginPath();
      if (c.roundRect) c.roundRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 5); else c.rect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
      c.fill();
      c.fillStyle = '#11151c';
      c.beginPath(); c.arc(ball.x, ball.y, R, 0, Math.PI * 2); c.fill();
    }

    function tick(now) {
      if (!running) return;
      // Normalize to 60 fps; cap dt so a background tab can't teleport the ball.
      var dt = Math.min((now - last) / (1000 / 60), 3);
      last = now;
      elapsed += dt * (1000 / 60);

      if (keys.ArrowLeft) paddleX = Math.max(0, paddleX - 7 * dt);
      if (keys.ArrowRight) paddleX = Math.min(W - PADDLE_W, paddleX + 7 * dt);

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
        var off = (ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
        var dir = Math.abs(off) < 0.05 ? (ball.vx < 0 ? -1 : 1) : (off < 0 ? -1 : 1);
        ball.vx = dir * baseVx * (0.6 + 0.8 * Math.min(1, Math.abs(off)));
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
        ball.x = W / 2; ball.y = H * 0.45;
        ball.vx = (Math.random() < 0.5 ? -1 : 1) * baseVx;
        ball.vy = startDir * baseVy;
        paddleX = (W - PADDLE_W) / 2;
        elapsed = 0; running = true; last = performance.now();
        draw();
        raf = requestAnimationFrame(tick);
      },
      stop: function () { running = false; cancelAnimationFrame(raf); }
    };
  };
})();
