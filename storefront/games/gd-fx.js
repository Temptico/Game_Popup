/* GameDiscount – optional extras (win confetti, /contact fallback, manual code selection), loaded on demand by game-popup.js. */
(function () {
  'use strict';
  window.GameDiscountFx = {
    select: function (node) {
      var r = document.createRange(); r.selectNodeContents(node);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    },
    // Store the email through the theme's own customer form when the app
    // proxy is unreachable, without reloading the page.
    contact: function (name, email, consent) {
      var fd = new FormData();
      fd.append('form_type', 'customer');
      fd.append('utf8', '✓');
      fd.append('contact[email]', email);
      fd.append('contact[first_name]', name);
      fd.append('contact[tags]', consent ? 'gamediscount,newsletter' : 'gamediscount');
      if (consent) fd.append('contact[accepts_marketing]', 'true');
      return fetch('/contact', { method: 'POST', body: fd, redirect: 'manual', credentials: 'same-origin' }).catch(function () {});
    },
    confetti: function (host, colors) {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var cv = document.createElement('canvas');
      cv.className = 'gd-confetti';
      var w = cv.width = innerWidth, h = cv.height = innerHeight;
      host.appendChild(cv);
      var x = cv.getContext('2d'), bits = [];
      for (var i = 0; i < 140; i++) {
        bits.push({
          x: w / 2, y: h / 2, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -14 - 4,
          r: Math.random() * 6 + 3, c: colors[i % colors.length], a: Math.random() * 6
        });
      }
      var frames = 0;
      (function anim() {
        x.clearRect(0, 0, w, h);
        bits.forEach(function (b) {
          b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.a += 0.2;
          x.fillStyle = b.c; x.save(); x.translate(b.x, b.y); x.rotate(b.a);
          x.fillRect(-b.r / 2, -b.r / 4, b.r, b.r / 2); x.restore();
        });
        if (++frames < 150) requestAnimationFrame(anim); else cv.remove();
      })();
    }
  };
})();
