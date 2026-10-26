/* Kodra Play – spin wheel. Loaded on demand by game-popup.js.
 * Contract: factory(canvas, opts) -> { start({ tick, end(won), prize() }), stop() }
 * The server picks the reward: prize() resolves to the won value label (e.g. "15%",
 * or null), and the wheel stops on a segment that shows it. Every segment is a real reward. */
(function () {
  'use strict';
  var S = 280, R = S / 2 - 6, TAU = Math.PI * 2, SPEED = TAU * 2.5; // rad/s while waiting for the result

  (window.GameDiscountGames = window.GameDiscountGames || {}).wheel = function (canvas, o) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = S * dpr; canvas.height = S * dpr;
    var c = canvas.getContext('2d');
    c.scale(dpr, dpr);

    // Labels per tier, best first. Three tiers: the better the reward, the fewer
    // segments (1, 2 and 3 of 6). One reward: six equal segments.
    var labels = (o.wheel && o.wheel.length ? o.wheel : ['🎁']).slice(0, 3);
    var segs = labels.length === 3 ? [0, 2, 1, 2, 1, 2] : [0, 0, 0, 0, 0, 0].map(function (_, i) { return i % labels.length; });
    var n = segs.length, seg = TAU / n;
    var rot = -Math.PI / 2 - seg / 2, cb = null, raf = 0, state = 'off';

    function draw() {
      c.clearRect(0, 0, S, S);
      c.save();
      c.translate(S / 2, S / 2);
      for (var i = 0; i < n; i++) {
        var a = rot + i * seg, dark = i % 2 === 0;
        c.fillStyle = dark ? o.primaryColor : o.accentColor;
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, a, a + seg); c.closePath(); c.fill();
        // Labels run across the segment, upright when it is under the pointer.
        c.save();
        c.rotate(a + seg / 2 + Math.PI / 2);
        c.fillStyle = dark ? '#f5eeea' : '#11151c';
        c.font = 'bold 20px sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(labels[segs[i]], 0, -R * 0.66, R * 0.62);
        c.restore();
      }
      c.lineWidth = 4; c.strokeStyle = '#fff';
      c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.fill();
      c.fillStyle = o.primaryColor;
      c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill();
      c.restore();
      // Pointer at the top.
      c.fillStyle = '#fff'; c.strokeStyle = '#11151c'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(S / 2 - 13, 0); c.lineTo(S / 2 + 13, 0); c.lineTo(S / 2, 26); c.closePath(); c.fill(); c.stroke();
    }

    // Phase 1: spin at a steady speed until the result is known (at least 0.6 s).
    // Phase 2: ease out onto a segment of the won tier, starting at the same speed.
    function spin() {
      if (state !== 'ready') return;
      state = 'spin';
      var t0 = performance.now(), last = t0, won = undefined, from = 0, rest = 0, dur = 0, tEase = 0;
      cb.prize().then(function (v) { won = v; }, function () { won = null; });
      function frame(now) {
        if (state !== 'spin') return;
        if (!dur) {
          rot += SPEED * (now - last) / 1000;
          if (won !== undefined && now - t0 > 600) {
            var want = labels.indexOf(won); // unknown value: any segment
            var hits = segs.map(function (s, i) { return s === want || want < 0 ? i : -1; }).filter(function (i) { return i >= 0; });
            var k = hits[Math.floor(Math.random() * hits.length)];
            var target = -Math.PI / 2 - (k + 0.5 + (Math.random() - 0.5) * 0.6) * seg;
            from = rot; rest = ((target - rot) % TAU + TAU) % TAU + TAU * 3;
            dur = 3 * rest / SPEED * 1000; tEase = now;
          }
        } else {
          var p = Math.min(1, (now - tEase) / dur);
          rot = from + rest * (1 - Math.pow(1 - p, 3));
          if (p >= 1) { draw(); state = 'done'; setTimeout(function () { if (state === 'done') cb.end(true); }, 500); return; }
        }
        last = now;
        draw();
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    canvas.addEventListener('click', spin);
    document.addEventListener('keydown', function (e) {
      if (state === 'ready' && canvas.offsetParent && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); spin(); }
    });

    return {
      start: function (callbacks) { cb = callbacks; state = 'ready'; draw(); },
      stop: function () { state = 'off'; cancelAnimationFrame(raf); }
    };
  };
})();
