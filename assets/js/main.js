/* ============================================================================
   360 REALTY — page behaviour
   dark / light mode · config binding · preloader · AOS scroll animations ·
   nav · counters · quick search → contact form · field validation ·
   contact form + newsletter (Netlify Forms or FormSubmit) · FAQ accordion ·
   floating buttons
   ============================================================================ */
(function () {
  'use strict';

  var SITE = window.SITE || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, SITE); }
  var respectRM = !!(SITE.motion && SITE.motion.respectReducedMotion);
  var reduceMotion = respectRM && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var root = document.documentElement;
  if (reduceMotion) root.classList.add('reduce-motion');

  /* ------------------------------------------------------------------------
     Dark / light mode
     The inline script in <head> sets data-theme before the first paint
     (saved choice → otherwise the OS preference). This keeps it in sync:
     toggle buttons, the favicon, the address-bar colour and the 3D dial.
     ------------------------------------------------------------------------ */
  var THEME_KEY = '360realty-theme';
  function currentTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function storedTheme() {
    try { var t = localStorage.getItem(THEME_KEY); return (t === 'light' || t === 'dark') ? t : null; } catch (e) { return null; }
  }
  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ } }

    // favicon follows the site's mode (white mark on dark, dark mark on light)
    var svgIcon = $('#favicon-svg'), pngIcon = $('#favicon-png');
    if (svgIcon) svgIcon.setAttribute('href', 'assets/img/favicon-' + theme + '.svg');
    if (pngIcon) pngIcon.setAttribute('href', 'assets/img/favicon-' + theme + '-64.png');

    var meta = $('meta[name="theme-color"]');
    var bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (meta && bg) meta.setAttribute('content', bg);

    $$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      b.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
    document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: theme } }));
  }
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true); });
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onScheme = function (e) { if (!storedTheme()) applyTheme(e.matches ? 'light' : 'dark', false); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme);
  }
  applyTheme(currentTheme(), false);

  /* ------------------------------------------------------------------------
     Bind values from theme.js into the page
     <span data-bind="contact.email">                 → textContent
     <a data-bind-href="mailto:contact.email">        → href="mailto:…"
     <a data-bind-href="wa:contact.whatsapp">         → WhatsApp click-to-chat link
     <a data-bind-href="contact.socials.instagram">   → plain URL
     <li data-bind-hide="contact.phone">              → hidden when the value is empty
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
      var msg = 'Hello ' + (SITE.name || '') + ', I would like to enquire about a property in Dubai.';
      el.href = 'https://wa.me/' + String(v).replace(/\D/g, '') + '?text=' + encodeURIComponent(msg);
    } else if (prefix) {
      el.href = prefix + ':' + v;
    } else {
      el.href = v;
    }
  });
  $$('[data-bind-hide]').forEach(function (el) {
    var v = get(el.getAttribute('data-bind-hide'));
    if (v == null || v === '') { el.hidden = true; el.style.display = 'none'; }   // inline style beats Tailwind's .flex / .grid
  });
  if (get('contact.whatsapp')) document.body.classList.add('has-whatsapp');
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------------------
     Preloader — counts to 100%, then reveals the page, starts the scroll
     animations (AOS) and the dial build
     ------------------------------------------------------------------------ */
  var ready = false;
  function markReady() {
    if (ready) return;
    ready = true;
    var pre = $('#preloader');
    if (pre) pre.classList.add('is-done');
    root.classList.add('is-ready');
    document.dispatchEvent(new CustomEvent('site:ready'));
    startAnimations();
  }
  (function preloader() {
    var pct = $('#preloader-pct'), bar = $('#preloader-bar');
    if (!pct) { markReady(); return; }
    var start = performance.now(), dur = reduceMotion ? 200 : 1300;
    // Wait for the web fonts and the 3D scene (dial3d.js fires "scene:ready").
    // Deliberately NOT window.load — slow photos must never hold the preloader.
    var fontsOk = false, sceneOk = false;
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () { fontsOk = true; }, function () { fontsOk = true; });
    document.addEventListener('scene:ready', function () { sceneOk = true; });
    setTimeout(function () { fontsOk = true; sceneOk = true; }, 3000);   // cap: never wait longer than this
    setTimeout(markReady, 4500);   // hard safety net that works even if the tab is throttled (rAF paused)
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var loaded = fontsOk && sceneOk;
      var shown = loaded ? p : Math.min(p, 0.92);     // hold at 92% until fonts + scene are in
      var n = Math.round(shown * 100);
      pct.textContent = n + '%';
      if (bar) bar.style.width = n + '%';
      if (p >= 1 && loaded) { setTimeout(markReady, 250); return; }
      if (now - start > 4000) { markReady(); return; }         // never trap the visitor
      requestAnimationFrame(tick);
    })(start);
  })();

  /* ------------------------------------------------------------------------
     Scroll animations — AOS (https://michalsnik.github.io/aos/)
     Elements carry data-aos="fade-up" (+ data-aos-delay). AOS is started
     after the preloader so the hero animates in; if the library failed to
     load, everything is simply shown.
     ------------------------------------------------------------------------ */
  function startAnimations() {
    if (window.AOS) {
      window.AOS.init({ once: true, duration: 750, easing: 'ease-out-cubic', offset: 40, disable: reduceMotion });
    } else {
      root.classList.add('no-aos');
    }
  }

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
     Animated counters  <span data-count="500" data-decimals="0">0</span>
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
     FAQ — only one answer open at a time
     (<details name="faq"> does this natively in current browsers; this is
     the fallback for older ones)
     ------------------------------------------------------------------------ */
  var faqs = $$('details.faq');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqs.forEach(function (o) { if (o !== d && o.open) o.open = false; });
    });
  });

  /* ------------------------------------------------------------------------
     Quick search (hero) → takes the visitor to the contact form with their
     choice already filled in
     ------------------------------------------------------------------------ */
  var QS_TABS = {
    'Buy':      { label: 'Budget (AED)',         cta: 'Find properties',        ranges: 'sale' },
    'Sell':     { label: 'Expected price (AED)', cta: 'Request a valuation',    ranges: 'sale' },
    'Rent':     { label: 'Yearly rent (AED)',    cta: 'Find a rental',          ranges: 'rent' },
    'Off-plan': { label: 'Budget (AED)',         cta: 'See new launches',       ranges: 'sale' },
    'Mortgage': { label: 'Property price (AED)', cta: 'Check mortgage options', ranges: 'sale' }
  };
  var QS_RANGES = {
    sale: ['Under 1M', '1M to 2M', '2M to 5M', '5M to 10M', 'Above 10M'],
    rent: ['Under 60K', '60K to 100K', '100K to 150K', '150K to 250K', 'Above 250K']
  };
  var qs = $('#quick-search');
  if (qs) {
    var qsTabs = $$('[data-qs-tab]', qs), qsRange = $('#qs-range'), qsRangeLabel = $('#qs-range-label');
    var qsCtaText = $('#qs-cta-text') || $('#qs-cta');
    var qsCurrent = 'Buy';
    var setTab = function (name) {
      var cfg = QS_TABS[name] || QS_TABS.Buy;
      qsCurrent = QS_TABS[name] ? name : 'Buy';
      qsTabs.forEach(function (b) {
        var on = b.getAttribute('data-qs-tab') === qsCurrent;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      if (qsRangeLabel) qsRangeLabel.textContent = cfg.label;
      if (qsRange) {
        var prev = qsRange.value;
        qsRange.innerHTML = '';
        QS_RANGES[cfg.ranges].forEach(function (r) { var o = document.createElement('option'); o.value = r; o.textContent = r; qsRange.appendChild(o); });
        if (QS_RANGES[cfg.ranges].indexOf(prev) > -1) qsRange.value = prev;
      }
      if (qsCtaText) qsCtaText.textContent = cfg.cta;
    };
    qsTabs.forEach(function (b) { b.addEventListener('click', function () { setTab(b.getAttribute('data-qs-tab')); }); });
    setTab('Buy');
    qs.addEventListener('submit', function (e) {
      e.preventDefault();
      var cfg = QS_TABS[qsCurrent];
      prefillContact({
        intent: qsCurrent,
        type: ($('#qs-type') || {}).value || '',
        area: ($('#qs-area') || {}).value || '',
        range: qsRange ? qsRange.value : '',
        rangeLabel: cfg.label,
        isRent: cfg.ranges === 'rent'
      });
    });
  }
  function prefillContact(p) {
    var form = $('#enquiry-form');
    if (!form) return;
    var setVal = function (sel, val) {
      var el = $(sel, form);
      if (!el || !val) return;
      if (el.tagName === 'SELECT') {
        var has = Array.prototype.some.call(el.options, function (o) { return o.value === val; });
        if (has) el.value = val;
      } else el.value = val;
    };
    setVal('#f-intent', p.intent);
    setVal('#f-type', p.type);
    if (!p.isRent) setVal('#f-budget', p.range);
    var notes = [];
    if (p.area && !/^any/i.test(p.area)) notes.push('Preferred area: ' + p.area + '.');
    if (p.isRent && p.range) notes.push(p.rangeLabel + ': ' + p.range + '.');
    var msg = $('#f-message', form);
    if (msg && notes.length) {
      var existing = msg.value.trim();
      msg.value = notes.join(' ') + (existing ? '\n' + existing : '');
    }
    var contact = $('#contact');
    if (contact) contact.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    form.classList.remove('is-flash'); void form.offsetWidth; form.classList.add('is-flash');
    setTimeout(function () { var n = $('#f-name', form); if (n) n.focus({ preventScroll: true }); }, reduceMotion ? 0 : 750);
  }
  // Service / footer links can also pre-select the intent: <a href="#contact" data-intent="Sell">
  $$('[data-intent]').forEach(function (a) {
    a.addEventListener('click', function () {
      var sel = $('#f-intent');
      var val = a.getAttribute('data-intent');
      if (sel && Array.prototype.some.call(sel.options, function (o) { return o.value === val; })) sel.value = val;
    });
  });

  /* ------------------------------------------------------------------------
     Field validation
     <input data-validate="name|email|phone|message|select">
     Each field gets an inline message under it; the whole form is checked on
     submit and the first problem receives focus.
     ------------------------------------------------------------------------ */
  var RULES = {
    name: function (v) {
      v = v.trim();
      if (!v) return 'Please add your name so an advisor knows who to contact.';
      if (v.length < 2) return 'Please enter your full name.';
      if (/\d/.test(v)) return 'Please enter your name without numbers.';
      if (v.length > 80) return 'Please keep your name under 80 characters.';
      return '';
    },
    email: function (v) {
      v = v.trim();
      if (!v) return 'Please enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address.';
      return '';
    },
    phone: function (v) {
      v = v.trim();
      if (!v) return '';                                   // optional
      var digits = v.replace(/\D/g, '');
      if (!/^\+?[0-9\s().\-]+$/.test(v) || digits.length < 7 || digits.length > 15) return 'Please enter a valid phone number, e.g. +971 50 123 4567.';
      return '';
    },
    message: function (v) {
      return v.length > 1500 ? 'Please keep your message under 1,500 characters.' : '';
    },
    select: function (v) {
      return v ? '' : 'Please choose an option.';
    }
  };
  function errorEl(field) {
    var id = (field.id || field.name) + '-error';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('p');
      el.id = id; el.className = 'field-error'; el.hidden = true;
      field.insertAdjacentElement('afterend', el);
      field.setAttribute('aria-describedby', id);
    }
    return el;
  }
  function showError(field, msg) {
    var el = errorEl(field);
    el.textContent = msg;
    el.hidden = !msg;
    if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
  }
  function validateField(field) {
    var rule = RULES[field.getAttribute('data-validate')];
    if (!rule) return '';
    var msg = rule(field.value || '');
    showError(field, msg);
    return msg;
  }
  function validateForm(form) {
    var first = null, firstMsg = '';
    $$('[data-validate]', form).forEach(function (f) {
      var m = validateField(f);
      if (m && !first) { first = f; firstMsg = m; }
    });
    if (first) first.focus();
    return { ok: !first, message: firstMsg };
  }
  function clearErrors(form) { $$('[data-validate]', form).forEach(function (f) { showError(f, ''); }); }
  function wireValidation(form) {
    $$('[data-validate]', form).forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value) validateField(f); });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) validateField(f); });
      f.addEventListener('change', function () { validateField(f); });
    });
  }

  /* ------------------------------------------------------------------------
     Delivery — see SITE.form.provider in theme.js
       'formsubmit' (default): emailed straight to SITE.contact.email
       'netlify'            : Netlify Forms only
       'both'               : FormSubmit email + a copy in the Netlify dashboard
     ------------------------------------------------------------------------ */
  var email = (SITE.contact && SITE.contact.email) || '';
  var PROVIDER = String((SITE.form && SITE.form.provider) || 'formsubmit').toLowerCase();
  function isLocalPreview() {
    return location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname);
  }
  function sendNetlify(formName, fields, subject) {
    if (isLocalPreview()) return Promise.reject(new Error('local-preview'));
    var body = new URLSearchParams();
    body.append('form-name', formName);
    if (subject) body.append('subject', subject);
    Object.keys(fields).forEach(function (k) { body.append(k, fields[k]); });
    return fetch(location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
  }
  function sendFormSubmit(fields, subject) {
    if (!email) return Promise.reject(new Error('no-email'));
    var payload = {};
    Object.keys(fields).forEach(function (k) { payload[k] = fields[k]; });
    payload._subject = subject;                 // email subject line
    payload._template = 'table';                // tidy table layout in the email
    payload._captcha = 'false';                 // the honeypot handles bots
    if (fields.email) payload._replyto = fields.email;   // "Reply" goes to the visitor
    return fetch('https://formsubmit.co/ajax/' + email, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j || {} }; }, function () { return { ok: r.ok, j: {} }; });
    }).then(function (res) {
      if (res.ok && String(res.j.success) === 'true') return true;
      throw new Error(res.j.message || 'Request failed');
    });
  }
  function deliver(formName, fields, subject) {
    if (PROVIDER === 'netlify') return sendNetlify(formName, fields, subject);
    if (PROVIDER === 'both' && !isLocalPreview()) sendNetlify(formName, fields, subject).catch(function () { /* dashboard copy only */ });
    return sendFormSubmit(fields, subject);
  }
  function failureMessage(err, fallback) {
    var m = err && err.message;
    if (m === 'local-preview') return 'Netlify Forms only work on the deployed site (this is a local preview). To test locally, set SITE.form.provider to "formsubmit" in assets/js/theme.js.';
    if (m === 'no-email') return 'The enquiry address is not set yet — add it in assets/js/theme.js (SITE.contact.email).';
    return fallback;
  }
  function statusSetter(el) {
    return function (kind, msg) {
      if (!el) return;
      el.textContent = msg;
      el.className = el.className.replace(/\bis-\w+/g, '').trim() + ' is-' + kind;
    };
  }
  function collect(form) {
    var fields = {};
    new FormData(form).forEach(function (v, k) {
      if (k === 'bot-field' || k === 'form-name' || k === 'subject') return;
      fields[k] = typeof v === 'string' ? v.trim() : v;
    });
    return fields;
  }

  /* ------------------------------------------------------------------------
     Contact form
     ------------------------------------------------------------------------ */
  var form = $('#enquiry-form');
  if (form) {
    var setStatus = statusSetter($('#form-status'));
    var subject = (SITE.form && SITE.form.subject) || 'New website enquiry';
    wireValidation(form);
    var hiddenField = function (name, value) {
      var input = form.querySelector('input[name="' + name + '"]');
      if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.appendChild(input); }
      input.value = value;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var check = validateForm(form);
      if (!check.ok) { setStatus('error', check.message); return; }
      var honey = form.querySelector('input[name="bot-field"]');
      if (honey && honey.value) return;                       // bot filled the hidden field

      var btn = form.querySelector('button[type="submit"]'), label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      setStatus('info', 'Sending your enquiry…');

      var fields = collect(form);
      var firstName = (fields.name || '').split(/\s+/)[0];

      deliver('enquiry', fields, subject)
        .then(function () {
          setStatus('ok', 'Thanks, ' + firstName + '. A 360 Realty advisor will be in touch shortly.');
          form.reset();
          clearErrors(form);
        })
        .catch(function (err) {
          if (PROVIDER !== 'netlify' && email && err.message !== 'no-email') {
            // FormSubmit fallback: classic POST (works without fetch / CORS; FormSubmit shows its own
            // confirmation and, on the very first message, the activation page for the inbox owner)
            form.action = 'https://formsubmit.co/' + email;
            form.method = 'POST';
            hiddenField('_subject', subject);
            hiddenField('_template', 'table');
            hiddenField('_captcha', 'false');
            hiddenField('_next', location.href.split('#')[0] + '#contact');
            form.submit();
            return;
          }
          setStatus('error', failureMessage(err, 'Sorry, your enquiry could not be sent. Please email ' + (email || 'us') + ' directly.'));
        })
        .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = label; } });
    });
  }

  /* ------------------------------------------------------------------------
     Newsletter (footer)
     ------------------------------------------------------------------------ */
  var nl = $('#newsletter-form');
  if (nl) {
    var setNl = statusSetter($('#newsletter-status'));
    wireValidation(nl);
    nl.addEventListener('submit', function (e) {
      e.preventDefault();
      var check = validateForm(nl);
      if (!check.ok) { setNl('error', check.message); return; }
      var honey = nl.querySelector('input[name="bot-field"]');
      if (honey && honey.value) return;
      var btn = nl.querySelector('button[type="submit"]'), label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = '…'; }
      setNl('info', 'Subscribing…');
      deliver('newsletter', collect(nl), (SITE.form && SITE.form.newsletterSubject) || 'Newsletter sign-up')
        .then(function () { setNl('ok', "You're subscribed. Look out for our next update."); nl.reset(); clearErrors(nl); })
        .catch(function (err) { setNl('error', failureMessage(err, 'Something went wrong. Please try again, or email ' + (email || 'us') + '.')); })
        .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = label; } });
    });
  }

  onScroll();
})();
