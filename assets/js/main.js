/* ============================================================================
   360 REALITY — page behaviour
   preloader · config binding · nav · pinned-hero chapters · reveal animations ·
   counters · property filter · contact form (FormSubmit) · floating buttons
   ============================================================================ */
(function () {
  'use strict';

  var SITE = window.SITE || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, SITE); }
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ------------------------------------------------------------------------
     Bind values from theme.js into the page
     <span data-bind="contact.phone">  → textContent
     <a data-bind-href="tel:contact.phoneHref"> → href="tel:+971…"
     <a data-bind-href="wa:contact.whatsapp">   → WhatsApp click-to-chat link
     <a data-bind-href="contact.socials.instagram"> → plain URL
     ------------------------------------------------------------------------ */
  $$('[data-bind]').forEach(function (el) {
    var v = get(el.getAttribute('data-bind'));
    if (v != null && v !== '') el.textContent = v;
  });
  $$('[data-bind-href]').forEach(function (el) {
    var spec = el.getAttribute('data-bind-href'), i = spec.indexOf(':');
    var prefix = i > -1 ? spec.slice(0, i) : '', path = i > -1 ? spec.slice(i + 1) : spec;
    var v = get(path);
    if (v == null || v === '') return;
    if (prefix === 'wa') {
      var msg = 'Hello ' + (SITE.name || '') + ', I would like to enquire about a property.';
      el.href = 'https://wa.me/' + String(v).replace(/\D/g, '') + '?text=' + encodeURIComponent(msg);
    } else if (prefix) {
      el.href = prefix + ':' + v;
    } else {
      el.href = v;
    }
  });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------------------
     Preloader — counts to 100%, then reveals the page and starts the 3D build
     ------------------------------------------------------------------------ */
  var ready = false;
  function markReady() {
    if (ready) return;
    ready = true;
    var pre = $('#preloader');
    if (pre) pre.classList.add('is-done');
    document.documentElement.classList.add('is-ready');
    document.dispatchEvent(new CustomEvent('site:ready'));
    startReveal();
  }
  (function preloader() {
    var pct = $('#preloader-pct'), bar = $('#preloader-bar');
    if (!pct) { markReady(); return; }
    var start = performance.now(), dur = reduceMotion ? 200 : 1300;
    // Wait for the web fonts and the 3D scene (building3d.js fires "scene:ready").
    // Deliberately NOT window.load — slow listing photos must never hold the preloader.
    var fontsOk = false, sceneOk = false;
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () { fontsOk = true; }, function () { fontsOk = true; });
    document.addEventListener('scene:ready', function () { sceneOk = true; });
    setTimeout(function () { fontsOk = true; sceneOk = true; }, 3000);   // cap: never wait longer than this
    setTimeout(markReady, 4500);   // hard safety net that works even if the tab is throttled (rAF paused)
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var loaded = fontsOk && sceneOk;
      // hold at 92% until fonts + scene are in
      var shown = loaded ? p : Math.min(p, 0.92);
      var n = Math.round(shown * 100);
      pct.textContent = n + '%';
      if (bar) bar.style.width = n + '%';
      if (p >= 1 && loaded) { setTimeout(markReady, 250); return; }
      if (now - start > 4000) { markReady(); return; }         // never trap the visitor
      requestAnimationFrame(tick);
    })(start);
  })();

  /* ------------------------------------------------------------------------
     Header, scroll progress bar, back-to-top
     ------------------------------------------------------------------------ */
  var header = $('#site-header'), progress = $('#scroll-progress'), toTop = $('#to-top');
  function onScroll() {
    var y = window.pageYOffset || 0;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
    updateChapters(y);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */
  var menuBtn = $('#menu-btn'), menu = $('#mobile-menu');
  if (menuBtn && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('hidden', !open);
      menuBtn.setAttribute('aria-expanded', String(open));
      $('.icon-open', menuBtn).classList.toggle('hidden', open);
      $('.icon-close', menuBtn).classList.toggle('hidden', !open);
    };
    menuBtn.addEventListener('click', function () { setMenu(menu.classList.contains('hidden')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ------------------------------------------------------------------------
     Active nav link (scroll spy)
     ------------------------------------------------------------------------ */
  var sections = $$('main section[id]'), navLinks = $$('.nav-link');
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = '#' + en.target.id;
        navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------------------------------
     Pinned hero chapters — which caption is showing depends on how far
     through the tall [data-pin] section the visitor has scrolled.
     ------------------------------------------------------------------------ */
  var pin = $('[data-pin]');
  var chapters = pin ? $$('[data-chapter]', pin) : [];
  var dotsWrap = pin ? $('[data-chapter-dots]', pin) : null;
  var hint = pin ? $('[data-scroll-hint]', pin) : null;
  var dots = [];
  if (pin && chapters.length && dotsWrap) {
    chapters.forEach(function (ch, idx) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chapter-dot';
      b.setAttribute('aria-label', 'Go to chapter ' + (idx + 1));
      b.addEventListener('click', function () {
        var r = pin.getBoundingClientRect();
        var top = r.top + window.pageYOffset + Math.max(0, r.height - window.innerHeight) * parseFloat(ch.getAttribute('data-at') || 0);
        window.scrollTo({ top: top + 1, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      dotsWrap.appendChild(b); dots.push(b);
    });
  }
  function updateChapters(y) {
    if (!pin || !chapters.length) return;
    var r = pin.getBoundingClientRect();
    var range = Math.max(1, r.height - window.innerHeight);
    var p = Math.min(1, Math.max(0, (y - (r.top + y)) / range));   // 0 → 1 through the pinned section
    var best = 0, bestD = Infinity;
    chapters.forEach(function (ch, idx) {
      var d = Math.abs(p - parseFloat(ch.getAttribute('data-at') || 0));
      if (d < bestD) { bestD = d; best = idx; }
    });
    chapters.forEach(function (ch, idx) { ch.classList.toggle('is-current', idx === best); });
    dots.forEach(function (d, idx) { d.classList.toggle('is-active', idx === best); });
    if (hint) hint.style.opacity = String(Math.max(0, 1 - p * 1.4));
  }

  /* ------------------------------------------------------------------------
     Reveal-on-scroll (starts after the preloader so the hero animates in)
     ------------------------------------------------------------------------ */
  function startReveal() {
    var reveals = $$('.reveal');
    if (!('IntersectionObserver' in window)) { reveals.forEach(function (el) { el.classList.add('is-visible'); }); return; }
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); ro.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  }

  /* ------------------------------------------------------------------------
     Animated counters  <span data-count="1200" data-decimals="0">0</span>
     ------------------------------------------------------------------------ */
  function animateCount(el) {
    var end = parseFloat(el.getAttribute('data-count')) || 0;
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var dur = reduceMotion ? 1 : 1800, start = performance.now();
    var fmt = function (v) { return v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    (function step(now) {
      var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(end * e);
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  } else counters.forEach(animateCount);

  /* ------------------------------------------------------------------------
     Property filter buttons
     ------------------------------------------------------------------------ */
  var filterBtns = $$('[data-filter]'), items = $$('.property-item');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      filterBtns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      items.forEach(function (it) {
        var show = f === 'all' || it.getAttribute('data-type') === f || it.getAttribute('data-status') === f;
        it.classList.toggle('is-hidden', !show);
      });
    });
  });

  /* ------------------------------------------------------------------------
     Contact form → your inbox via FormSubmit (https://formsubmit.co)
     1. Tries the AJAX endpoint (stays on the page, shows a success message)
     2. Falls back to a normal POST if that is blocked
     The destination address is SITE.contact.email in assets/js/theme.js.
     ------------------------------------------------------------------------ */
  var form = $('#enquiry-form');
  if (form) {
    var statusEl = $('#form-status');
    var email = (SITE.contact && SITE.contact.email) || '';
    var subject = (SITE.form && SITE.form.subject) || 'New website enquiry';

    var setStatus = function (kind, msg) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'form-status text-sm is-' + kind;
    };
    var hiddenField = function (name, value) {
      var input = form.querySelector('input[name="' + name + '"]');
      if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.appendChild(input); }
      input.value = value;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) return;                       // bot filled the hidden field
      if (!email || /@example\.com$/i.test(email)) {
        setStatus('warn', 'Almost there — set your email address in assets/js/theme.js (SITE.contact.email) so enquiries reach your inbox.');
        return;
      }

      var btn = form.querySelector('button[type="submit"]'), label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      setStatus('info', 'Sending your enquiry…');

      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== '_honey') data[k] = v; });
      data._subject = subject;
      data._template = 'table';
      data._captcha = 'false';

      fetch('https://formsubmit.co/ajax/' + email, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j || {} }; }); })
        .then(function (res) {
          if (res.ok && String(res.j.success) === 'true') {
            setStatus('ok', 'Thank you — your enquiry has been sent. An advisor will be in touch shortly.');
            form.reset();
          } else {
            throw new Error(res.j.message || 'Request failed');
          }
        })
        .catch(function () {
          // Fallback: classic POST (works without fetch / CORS; FormSubmit shows its own confirmation)
          form.action = 'https://formsubmit.co/' + email;
          form.method = 'POST';
          hiddenField('_subject', subject);
          hiddenField('_template', 'table');
          hiddenField('_next', location.href.split('#')[0] + '#contact');
          form.submit();
        })
        .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = label; } });
    });
  }

  onScroll();
})();
