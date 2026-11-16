// Interactions for the site. Every feature is optional: the pages read fine without it.
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── Mobile menu ── */
  var btn = $('.menu-btn'), nav = $('#site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ── Scroll progress bar, header shadow, timeline fill ── */
  var header = $('.site-header'), timeline = $('.timeline'), ticking = false;
  function onScroll() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty('--scroll', max > 0 ? Math.min(1, window.scrollY / max) : 0);
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
    if (timeline) {
      var r = timeline.getBoundingClientRect();
      var p = (window.innerHeight * 0.65 - r.top) / r.height;
      timeline.style.setProperty('--p', Math.max(0, Math.min(1, p)));
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ── Count-up numbers ── */
  function countUp(el) {
    var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10);
    var suffix = el.dataset.suffix || '';
    if (reduce || isNaN(target)) return;
    var start = null, dur = 1400;
    function step(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * eased).toFixed(dec) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ── Reveal on scroll ── */
  var reveals = $$('[data-reveal]');
  function show(el) {
    el.classList.add('in');
    $$('[data-count]', el).forEach(countUp);
    if (el.hasAttribute('data-count')) countUp(el);
  }
  // Stagger siblings that appear together
  reveals.forEach(function (el) {
    var sibs = $$(':scope > [data-reveal]', el.parentElement);
    var i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 80 + 'ms');
  });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Pointer spotlight on cards ── */
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('.spot');
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ── Typed line in the hero ── */
  var typed = $('.typed');
  if (typed && !reduce) {
    var words = typed.dataset.words.split('|'), w = 0, c = words[0].length, del = true;
    (function tick() {
      var word = words[w], wait;
      if (del) {
        if (c === word.length) { wait = 1900; c--; }
        else if (c > 0) { c--; wait = 28; }
        else { del = false; w = (w + 1) % words.length; wait = 280; }
      } else {
        word = words[w];
        if (c < word.length) { c++; wait = 55; }
        else { del = true; wait = 0; }
      }
      typed.textContent = words[w].slice(0, Math.max(0, c));
      setTimeout(tick, wait);
    })();
  }

  /* ── Project filters ── */
  var filters = $$('.filter'), grid = $('.cards');
  if (filters.length && grid) {
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        var key = f.dataset.filter;
        filters.forEach(function (x) { x.setAttribute('aria-pressed', x === f ? 'true' : 'false'); });
        grid.classList.toggle('filtered', key !== 'all');
        $$('.card', grid).forEach(function (card) {
          var match = key === 'all' || card.dataset.cats.split(' ').indexOf(key) !== -1;
          card.hidden = !match;
          card.classList.remove('pop');
          if (match) { card.classList.add('in'); void card.offsetWidth; card.classList.add('pop'); }
        });
      });
    });
  }

  /* ── Technologies: show where each was used ── */
  var used = $('.used'), chips = $$('.chip');
  if (used && chips.length) {
    var out = $('.used-v', used), label = $('.used-k', used);
    chips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () {
        chips.forEach(function (x) { x.setAttribute('aria-pressed', x === chip ? 'true' : 'false'); });
        label.textContent = chip.textContent + ' · used in';
        out.textContent = chip.dataset.used.split(' | ').join(', ');
        used.classList.remove('flash'); void used.offsetWidth; used.classList.add('flash');
      });
    });
  }

  /* ── Copy email ── */
  $$('.copy').forEach(function (b) {
    var original = b.textContent;
    b.addEventListener('click', function () {
      var done = function () {
        b.textContent = 'Copied'; b.classList.add('done');
        setTimeout(function () { b.textContent = original; b.classList.remove('done'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(b.dataset.copy).then(done, function () { window.location.href = 'mailto:' + b.dataset.copy; });
      } else {
        window.location.href = 'mailto:' + b.dataset.copy;
      }
    });
  });

  /* ── Hero background: a quiet network of nodes that reacts to the pointer ── */
  var canvas = $('#net');
  if (canvas && canvas.getContext && !reduce) {
    var ctx = canvas.getContext('2d'), nodes = [], W = 0, H = 0, dpr = 1;
    var mouse = { x: -9999, y: -9999 }, running = false, LINK = 150;

    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(18, Math.min(60, Math.round(W * H / 22000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({ x: Math.random() * W, y: Math.random() * H,
                     vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
                     r: 1.4 + Math.random() * 1.6 });
      }
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, dx, dy, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
        // gentle pull toward the pointer
        dx = mouse.x - a.x; dy = mouse.y - a.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180 && d > 1) { a.x += dx / d * 0.25; a.y += dy / d * 0.25; }
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(47,117,102,' + (0.16 * (1 - d / LINK)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 200) {
          ctx.strokeStyle = 'rgba(79,127,168,' + (0.35 * (1 - d / 200)).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(47,117,102,0.35)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    var hero = canvas.parentElement;
    hero.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    window.addEventListener('resize', resize);
    resize();

    // Only animate while the hero is on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(frame); }
        else if (!vis) running = false;
      }).observe(canvas);
    } else { running = true; requestAnimationFrame(frame); }
  }
})();
