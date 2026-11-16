// Interactions for the site. Every feature is optional: the pages read fine without it.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var EMAIL = 'naveen2005ragav@gmail.com';

  // Things started for the current page that must stop when the page changes
  var cleanups = [];
  function cleanup() { cleanups.forEach(function (f) { try { f(); } catch (e) {} }); cleanups = []; }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function toast(text) {
    $$('.toast').forEach(function (t) { t.remove(); });
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2300);
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { toast('Email address copied'); return true; },
        function () { window.location.href = 'mailto:' + text; return false; });
    }
    window.location.href = 'mailto:' + text;
    return Promise.resolve(false);
  }

  /* ════════ Theme ════════ */

  var netColors = { a: '44,110,95', b: '74,120,163' };
  function readColors() {
    var cs = getComputedStyle(root);
    netColors.a = cs.getPropertyValue('--net-rgb').trim() || netColors.a;
    netColors.b = cs.getPropertyValue('--net2-rgb').trim() || netColors.b;
  }
  function setTheme(theme, origin) {
    var apply = function () {
      root.dataset.theme = theme;
      try { localStorage.setItem('theme', theme); } catch (e) {}
      readColors();
    };
    if (!document.startViewTransition || reduce) { apply(); return; }
    // The new theme grows out of the button as a circle
    var x = origin ? origin.x : window.innerWidth - 60, y = origin ? origin.y : 30;
    var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.classList.add('theme-vt');
    var vt = document.startViewTransition(apply);
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 550, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
    vt.finished.then(function () { root.classList.remove('theme-vt'); }, function () { root.classList.remove('theme-vt'); });
  }
  function toggleTheme(origin) { setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', origin); }
  readColors();

  /* ════════ Posts ════════ */

  var postsPromise = null;
  function getPosts() {
    if (!postsPromise) {
      postsPromise = fetch('posts/posts.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('posts'); return r.json(); })
        .then(function (list) {
          return list.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        })
        .catch(function () { postsPromise = null; return []; });
    }
    return postsPromise;
  }
  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function postUrl(p) { return 'post.html?p=' + encodeURIComponent(p.slug); }

  var scripts = {};
  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }

  function initWritingList(main) {
    var list = $('[data-post-list]', main), tagBar = $('[data-post-tags]', main);
    if (!list) return;
    getPosts().then(function (all) {
      var posts = all.filter(function (p) { return !p.draft; });
      if (!posts.length) {
        list.outerHTML = '<div class="empty"><strong>Nothing here yet</strong>The first posts are on their way.</div>';
        return;
      }
      var tags = [];
      posts.forEach(function (p) { (p.tags || []).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); }); });
      function render(tag) {
        list.innerHTML = posts.filter(function (p) { return !tag || (p.tags || []).indexOf(tag) >= 0; }).map(function (p) {
          return '<li class="pop"><a class="spot" href="' + postUrl(p) + '">' +
            '<time datetime="' + esc(p.date) + '">' + esc(fmtDate(p.date)) + '</time>' +
            '<strong>' + esc(p.title) + '</strong>' +
            (p.summary ? '<p>' + esc(p.summary) + '</p>' : '') +
            ((p.tags || []).length ? '<ul class="tags">' + p.tags.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
            '</a></li>';
        }).join('');
      }
      if (tags.length > 1 && tagBar) {
        tagBar.hidden = false;
        tagBar.innerHTML = '<button type="button" class="filter" data-tag="" aria-pressed="true">All</button>' +
          tags.map(function (t) { return '<button type="button" class="filter" data-tag="' + esc(t) + '" aria-pressed="false">' + esc(t) + '</button>'; }).join('');
        tagBar.addEventListener('click', function (e) {
          var b = e.target.closest('[data-tag]'); if (!b) return;
          $$('[data-tag]', tagBar).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          render(b.dataset.tag);
        });
      }
      render('');
    });
  }

  function initPost(main) {
    var body = $('[data-post-body]', main);
    if (!body) return;
    var slug = new URLSearchParams(window.location.search).get('p');
    var title = $('[data-post-title]', main), meta = $('[data-post-meta]', main);
    var summary = $('[data-post-summary]', main), nav = $('[data-post-nav]', main);
    function missing() {
      title.textContent = 'Post not found';
      body.innerHTML = '<p>This post does not exist. <a href="writing.html">See all posts</a>.</p>';
    }
    if (!slug || !/^[\w-]+$/.test(slug)) { missing(); return; }
    getPosts().then(function (all) {
      var post = all.filter(function (p) { return p.slug === slug; })[0];
      if (!post) { missing(); return; }
      title.textContent = post.title;
      summary.textContent = post.summary || '';
      document.title = post.title + ' · Naveen Ragav Karthikeyan';
      return Promise.all([
        fetch('posts/' + slug + '.md', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('md'); return r.text(); }),
        loadScript('vendor/marked.umd.js')
      ]).then(function (res) {
        var md = res[0], words = md.trim().split(/\s+/).length;
        meta.innerHTML = esc(fmtDate(post.date)) + ' · ' + Math.max(1, Math.round(words / 200)) + ' min read' +
          (post.draft ? '<span class="draft-flag">Draft</span>' : '');
        body.innerHTML = window.marked.parse(md);
        var pub = all.filter(function (p) { return !p.draft; }), i = pub.indexOf(post);
        if (i >= 0 && nav) {
          var newer = pub[i - 1], older = pub[i + 1];
          nav.innerHTML = (older ? '<a href="' + postUrl(older) + '"><span>Previous</span>' + esc(older.title) + '</a>' : '') +
            (newer ? '<a class="next" href="' + postUrl(newer) + '"><span>Next</span>' + esc(newer.title) + '</a>' : '');
        }
        onScroll();
      });
    }).catch(function () {
      body.innerHTML = '<p>This post could not be loaded. Please try again.</p>';
    });
  }

  function initLatest(main) {
    var box = $('[data-latest-post]', main);
    if (!box) return;
    getPosts().then(function (all) {
      var p = all.filter(function (x) { return !x.draft; })[0];
      if (!p) return;
      box.innerHTML = '<a class="latest" href="' + postUrl(p) + '"><strong>' + esc(p.title) + '</strong>' +
        '<span>' + esc(fmtDate(p.date)) + '</span><span class="arrow">Read</span></a>';
    });
  }

  /* ════════ Per-page features ════════ */

  function countUp(el) {
    var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || '0', 10);
    var suffix = el.dataset.suffix || '';
    if (reduce || isNaN(target) || el.dataset.done) return;
    el.dataset.done = '1';
    var start = null, dur = 1400;
    function step(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * eased).toFixed(dec) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initReveal(main) {
    var reveals = $$('[data-reveal]', main);
    function show(el) { el.classList.add('in'); $$('[data-count]', el).forEach(countUp); }
    reveals.forEach(function (el) {
      var sibs = $$(':scope > [data-reveal]', el.parentElement), i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
    });
    if (!('IntersectionObserver' in window) || reduce) { reveals.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
    cleanups.push(function () { io.disconnect(); });
  }

  function initTyped(main) {
    var typed = $('.typed', main);
    if (!typed || reduce) return;
    var words = typed.dataset.words.split('|'), w = 0, c = words[0].length, del = true, timer;
    (function tick() {
      var wait;
      if (del) {
        if (c === words[w].length) { wait = 1900; c--; }
        else if (c > 0) { c--; wait = 26; }
        else { del = false; w = (w + 1) % words.length; wait = 280; }
      } else if (c < words[w].length) { c++; wait = 52; }
      else { del = true; wait = 0; }
      typed.textContent = words[w].slice(0, Math.max(0, c));
      timer = setTimeout(tick, wait);
    })();
    cleanups.push(function () { clearTimeout(timer); });
  }

  // Hero background: a quiet network of nodes that reacts to the pointer
  function initNet(main) {
    var canvas = $('#net', main);
    if (!canvas || !canvas.getContext || reduce) return;
    var ctx = canvas.getContext('2d'), nodes = [], W = 0, H = 0, dpr = 1;
    var mouse = { x: -9999, y: -9999 }, running = false, alive = true, LINK = 150;

    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(18, Math.min(64, Math.round(W * H / 21000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({ x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28, r: 1.4 + Math.random() * 1.6 });
      }
    }
    function frame() {
      if (!running || !alive) return;
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, dx, dy, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i]; a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
        dx = mouse.x - a.x; dy = mouse.y - a.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180 && d > 1) { a.x += dx / d * 0.25; a.y += dy / d * 0.25; }
      }
      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(' + netColors.a + ',' + (0.18 * (1 - d / LINK)).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 200) {
          ctx.strokeStyle = 'rgba(' + netColors.b + ',' + (0.4 * (1 - d / 200)).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(' + netColors.a + ',0.38)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    var hero = canvas.parentElement;
    hero.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    window.addEventListener('resize', resize);
    resize();
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(frame); } else if (!vis) running = false;
      });
      io.observe(canvas);
    } else { running = true; requestAnimationFrame(frame); }
    cleanups.push(function () { alive = false; window.removeEventListener('resize', resize); if (io) io.disconnect(); });
  }

  function initPage() {
    var main = $('#main');
    initReveal(main); initTyped(main); initNet(main);
    initWritingList(main); initPost(main); initLatest(main);
    onScroll();
  }

  /* ════════ Scroll: progress bar, header, timeline fill ════════ */

  var header = $('.site-header'), ticking = false;
  function onScroll() {
    ticking = false;
    var max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--scroll', max > 0 ? Math.min(1, window.scrollY / max) : 0);
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
    var timeline = $('.timeline');
    if (timeline) {
      var r = timeline.getBoundingClientRect();
      timeline.style.setProperty('--p', Math.max(0, Math.min(1, (window.innerHeight * 0.65 - r.top) / r.height)));
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ════════ Pointer spotlight on cards ════════ */

  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('.spot');
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ════════ In-place page changes (no full reload) ════════ */

  var nav = $('#site-nav'), menuBtn = $('.menu-btn');
  function closeMenu() { if (nav) nav.classList.remove('open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); }
  function pageKey(url) { var p = url.pathname.split('/').pop() || 'index.html'; return p; }
  function markNav(doc) {
    var current = $('#site-nav a[aria-current="page"]', doc);
    var href = current ? current.getAttribute('href') : null;
    $$('#site-nav a').forEach(function (a) {
      if (a.getAttribute('href') === href) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  var canRoute = /^https?:$/.test(window.location.protocol) && 'fetch' in window && 'DOMParser' in window && window.history && window.history.pushState;
  var navToken = 0;

  function go(url, push) {
    if (!canRoute) { window.location.href = url.href; return; }
    var token = ++navToken;
    closeMenu();
    fetch(url.href).then(function (r) { if (!r.ok) throw new Error('nav'); return r.text(); }).then(function (html) {
      if (token !== navToken) return;
      var doc = new DOMParser().parseFromString(html, 'text/html'), next = $('#main', doc);
      if (!next) throw new Error('nav');
      var swap = function () {
        cleanup();
        var main = $('#main');
        main.innerHTML = next.innerHTML;
        main.dataset.page = next.dataset.page || '';
        document.title = doc.title;
        markNav(doc);
        if (push) window.history.pushState({}, '', url.href);
        var target = url.hash ? document.getElementById(url.hash.slice(1)) : null;
        if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
        initPage();
      };
      if (document.startViewTransition && !reduce) document.startViewTransition(swap); else swap();
    }).catch(function () { window.location.href = url.href; });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.href); } catch (err) { return; }
    if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return;
    if (!/(\.html|\/)$/.test(url.pathname)) return;
    var same = pageKey(url) === pageKey(window.location) && url.search === window.location.search;
    if (same) { closeMenu(); if (!url.hash) { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); } return; }
    if (!canRoute) return;
    e.preventDefault();
    go(url, true);
  });
  window.addEventListener('popstate', function () { if (canRoute) go(new URL(window.location.href), false); });

  /* ════════ Clicks handled in one place ════════ */

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('button');
    if (!t) return;

    if (t.classList.contains('menu-btn')) {
      var open = nav.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    if (t.hasAttribute('data-theme-toggle')) {
      var r = t.getBoundingClientRect();
      toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      return;
    }
    if (t.hasAttribute('data-palette')) { openPalette(); return; }

    if (t.dataset.copy) {
      var label = t.textContent;
      copy(t.dataset.copy).then(function (ok) {
        if (!ok) return;
        t.textContent = 'Copied'; t.classList.add('done');
        setTimeout(function () { t.textContent = label; t.classList.remove('done'); }, 1800);
      });
      return;
    }

    // Project filters
    if (t.dataset.filter) {
      var grid = $('.cards'), key = t.dataset.filter;
      $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
      $$('.card', grid).forEach(function (card) {
        var match = key === 'all' || card.dataset.cats.split(' ').indexOf(key) !== -1;
        card.hidden = !match;
        card.classList.remove('pop');
        if (match) { card.classList.add('in'); void card.offsetWidth; card.classList.add('pop'); }
      });
      return;
    }

    // Technologies: show where each was used
    if (t.classList.contains('chip')) {
      var used = $('.used');
      $$('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
      $('.used-k', used).textContent = t.textContent + ' · used in';
      $('.used-v', used).textContent = t.dataset.used.split(' | ').join(', ');
      used.classList.remove('flash'); void used.offsetWidth; used.classList.add('flash');
      return;
    }

    // PEAQ gate diagram
    if (t.dataset.gate) {
      var flow = t.closest('.flow'), note = $('.flow-note', flow);
      flow.dataset.state = t.dataset.gate;
      $$('[data-gate]', flow).forEach(function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
      note.textContent = note.dataset[t.dataset.gate];
    }
  });

  /* ════════ Quick menu (Ctrl/Cmd + K) ════════ */

  var palette = null, pInput, pList, pItems = [], pIndex = 0;
  var baseItems = [
    { label: 'Home', kind: 'Page', href: 'index.html' },
    { label: 'About', kind: 'Page', href: 'about.html' },
    { label: 'Experience', kind: 'Page', href: 'about.html#experience' },
    { label: 'Projects', kind: 'Page', href: 'projects.html' },
    { label: 'Research interests', kind: 'Page', href: 'research.html' },
    { label: 'Publications', kind: 'Page', href: 'research.html#publications' },
    { label: 'Writing', kind: 'Page', href: 'writing.html' },
    { label: 'Contact', kind: 'Page', href: 'contact.html' },
    { label: 'Switch light / dark mode', kind: 'Action', run: function () { toggleTheme(); } },
    { label: 'Copy email address', kind: 'Action', run: function () { copy(EMAIL); } },
    { label: 'Open CV (PDF)', kind: 'Link', ext: 'Naveen_Ragav_CV.pdf' },
    { label: 'Open LinkedIn', kind: 'Link', ext: 'https://linkedin.com/in/naveen-ragav' },
    { label: 'Open GitHub', kind: 'Link', ext: 'https://github.com/Naveenragav2005' }
  ];
  var allItems = baseItems;

  function buildPalette() {
    palette = document.createElement('div');
    palette.className = 'palette'; palette.hidden = true;
    palette.setAttribute('role', 'dialog'); palette.setAttribute('aria-modal', 'true'); palette.setAttribute('aria-label', 'Quick menu');
    palette.innerHTML = '<div class="palette-box"><input type="text" placeholder="Go to a page, or type an action" aria-label="Search the quick menu" autocomplete="off" spellcheck="false"><ul role="listbox"></ul></div>';
    document.body.appendChild(palette);
    pInput = $('input', palette); pList = $('ul', palette);
    pInput.addEventListener('input', function () { pIndex = 0; renderPalette(); });
    pInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); pIndex = Math.min(pItems.length - 1, pIndex + 1); renderPalette(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pIndex = Math.max(0, pIndex - 1); renderPalette(); }
      else if (e.key === 'Enter') { e.preventDefault(); runItem(pItems[pIndex]); }
    });
    palette.addEventListener('click', function (e) {
      if (e.target === palette) { closePalette(); return; }
      var li = e.target.closest('li[data-i]');
      if (li) runItem(pItems[+li.dataset.i]);
    });
    pList.addEventListener('pointermove', function (e) {
      var li = e.target.closest('li[data-i]');
      if (li && +li.dataset.i !== pIndex) { pIndex = +li.dataset.i; renderPalette(); }
    });
  }
  function renderPalette() {
    var q = pInput.value.trim().toLowerCase();
    pItems = allItems.filter(function (it) { return !q || (it.label + ' ' + it.kind).toLowerCase().indexOf(q) >= 0; });
    pList.innerHTML = pItems.length ? pItems.map(function (it, i) {
      return '<li role="option" data-i="' + i + '" aria-selected="' + (i === pIndex) + '"><span>' + esc(it.label) + '</span><small>' + it.kind + '</small></li>';
    }).join('') : '<li class="none">Nothing matches</li>';
    var sel = $('[aria-selected="true"]', pList);
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }
  function runItem(it) {
    if (!it) return;
    closePalette();
    if (it.run) it.run();
    else if (it.ext) window.open(it.ext, '_blank', 'noopener');
    else if (it.href) {
      var url = new URL(it.href, window.location.href);
      if (pageKey(url) === pageKey(window.location) && url.search === window.location.search) {
        var el = url.hash && document.getElementById(url.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      } else go(url, true);
    }
  }
  var lastFocus = null;
  function openPalette() {
    if (!palette) buildPalette();
    lastFocus = document.activeElement;
    getPosts().then(function (posts) {
      allItems = baseItems.concat(posts.filter(function (p) { return !p.draft; }).map(function (p) {
        return { label: p.title, kind: 'Post', href: postUrl(p) };
      }));
      if (!palette.hidden) renderPalette();
    });
    palette.hidden = false; pInput.value = ''; pIndex = 0; renderPalette(); pInput.focus();
  }
  function closePalette() {
    if (!palette || palette.hidden) return;
    palette.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (palette && !palette.hidden) closePalette(); else openPalette();
    } else if (e.key === 'Escape') { closePalette(); closeMenu(); }
  });
  if (/Mac|iPhone|iPad/.test(navigator.platform || '')) $$('.palette-btn kbd').forEach(function (k) { k.textContent = '⌘K'; });

  /* ════════ Footer clock (Chennai time) ════════ */

  var clock = $('[data-clock]');
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    var tickClock = function () { clock.textContent = fmt.format(new Date()) + ' IST'; };
    tickClock(); setInterval(tickClock, 20000);
    clock.parentElement.hidden = false;
  }

  initPage();
})();
