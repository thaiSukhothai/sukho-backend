/* ============================================================================
   360 REALTY — SITE CONFIG & COLOUR THEME
   ----------------------------------------------------------------------------
   This is the ONE file you need to edit for:

     1. COLOUR SCHEME  → change ACTIVE_PALETTE below (or edit / add a palette).
                         Every palette has a `dark` and a `light` set; the
                         visitor's toggle (and their OS preference) picks one.
     2. ENQUIRY EMAIL  → SITE.contact.email  (contact form + newsletter deliver here)
     3. Phone / WhatsApp / address / social links (all optional — leave '' to hide)
     4. 3D dial behaviour → SITE.dial

   Every colour on the site — Tailwind classes (bg-accent/15, text-muted …),
   custom CSS (var(--accent), var(--gold) …) and the 3D dial — is generated
   from the active palette, so changing it here changes everything.
   ============================================================================ */

var PALETTES = {

  /* ── Default: deep teal-navy + teal + gold (matches the brand document) ──── */
  dubaiDusk: {
    brand: {                       // teal scale (50 = lightest, 950 = darkest)
      50:  '#effbf9', 100: '#d2f3ef', 200: '#a8e6e0', 300: '#74d3cc', 400: '#45bdb5',
      500: '#2ca198', 600: '#22837c', 700: '#1f6963', 800: '#1d5450', 900: '#1b4643', 950: '#0b2a2a',
    },
    dark: {
      bg:       '#0f2229',         // page background
      surface:  '#15303a',         // cards / panels
      ink:      '#f1f4f1',         // main text
      muted:    '#8da2a5',         // secondary text
      accent:   '#3db5ae',         // teal highlights, buttons, the Downtown dot
      accent2:  '#74d3cc',         // second colour of button gradients
      gold:     '#d6b27a',         // eyebrows, separators, the other five dots
      onAccent: '#0b1a1f',         // text on accent-coloured buttons
      line:     '#ffffff',         // hairlines / borders (used with transparency)
      shadow:   '#000000',         // card shadows (used with transparency)
      gradEnd:  '#ffffff',         // last stop of the heading gradient
    },
    light: {
      bg:       '#f3f7f7',
      surface:  '#ffffff',
      ink:      '#0f2229',
      muted:    '#5b6f74',
      accent:   '#15756e',
      accent2:  '#1f6963',
      gold:     '#9a7a3a',
      onAccent: '#ffffff',
      line:     '#0f2229',
      shadow:   '#0f2229',
      gradEnd:  '#0f2229',
    },
  },

  /* ── Deep navy + periwinkle (the previous look) ─────────────────────────── */
  midnightSapphire: {
    brand: {
      50:  '#eef2ff', 100: '#dde4ff', 200: '#c2cdff', 300: '#98aaff', 400: '#6b7dff',
      500: '#4a55f7', 600: '#3a3ae6', 700: '#302ecb', 800: '#2a28a3', 900: '#262781', 950: '#10103f',
    },
    dark:  { bg: '#04051a', surface: '#0b0d2b', ink: '#eef0ff', muted: '#9aa3cf', accent: '#8fb6ff', accent2: '#c2cdff', gold: '#e2c48a', onAccent: '#04051a', line: '#ffffff', shadow: '#000000', gradEnd: '#ffffff' },
    light: { bg: '#f4f6fc', surface: '#ffffff', ink: '#0d1033', muted: '#5c6487', accent: '#2f3fd6', accent2: '#302ecb', gold: '#9a7a3a', onAccent: '#ffffff', line: '#0d1033', shadow: '#0d1033', gradEnd: '#0d1033' },
  },

  /* ── Emerald + gold ─────────────────────────────────────────────────────── */
  emeraldLuxe: {
    brand: {
      50:  '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
      500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22',
    },
    dark:  { bg: '#03100b', surface: '#07211a', ink: '#eafff5', muted: '#8fb8a6', accent: '#34d399', accent2: '#6ee7b7', gold: '#f5d67a', onAccent: '#03100b', line: '#ffffff', shadow: '#000000', gradEnd: '#ffffff' },
    light: { bg: '#f3f8f5', surface: '#ffffff', ink: '#06261c', muted: '#4f6b60', accent: '#047857', accent2: '#065f46', gold: '#9a7a3a', onAccent: '#ffffff', line: '#06261c', shadow: '#06261c', gradEnd: '#06261c' },
  },
};

/* ▼▼▼  PICK THE ACTIVE COLOUR SCHEME HERE  ▼▼▼ */
var ACTIVE_PALETTE = 'dubaiDusk';


/* ============================================================================
   SITE SETTINGS
   ============================================================================ */
window.SITE = {
  name: '360 Realty',
  tagline: 'Dubai property, seen from every angle.',

  contact: {
    /* ▼▼▼  ENQUIRIES FROM THE CONTACT FORM AND NEWSLETTER ARE EMAILED HERE  ▼▼▼
       The very first message triggers a one-time activation email to this address — click
       "Activate" and every enquiry after that arrives directly (see form.provider below).
       Optional: if the activation email shows a random form ID, you can paste that here
       instead of the address to keep the address out of the page source. */
    email:     'hello@360.realty',

    /* Optional. Leave '' and the matching element is hidden automatically. */
    phone:     '',                         // shown on the site, e.g. '+971 4 000 0000'
    phoneHref: '',                         // tap-to-call, digits only, e.g. '+97140000000'
    whatsapp:  '',                         // digits only, country code first, e.g. '971500000000'
    address:   '',                         // office address line
    city:      'Dubai, UAE',
    socials: {
      instagram: '',
      linkedin:  '',
      facebook:  '',
    },
  },

  form: {
    /* ▼▼▼  HOW ENQUIRIES REACH THE INBOX  ▼▼▼
       'formsubmit' → every enquiry is emailed straight to SITE.contact.email by FormSubmit
                      (https://formsubmit.co). Works on Netlify or any other host, no account,
                      no server. The inbox owner clicks a one-time activation link the first
                      time a message arrives — after that every enquiry lands in the inbox.
       'netlify'    → Netlify Forms only: submissions go to the Netlify dashboard and are
                      emailed to the address set under Site configuration → Forms →
                      Form notifications (README §3).
       'both'       → FormSubmit email + a copy in the Netlify dashboard. */
    provider:          'formsubmit',
    subject:           'New enquiry from the 360 Realty website',
    newsletterSubject: 'Newsletter sign-up from the 360 Realty website',
  },

  /* Motion. Windows / macOS "reduce animations" settings make browsers report
     prefers-reduced-motion; set this to true to switch the marquee, the scroll
     animations and the dial's idle motion off for those visitors. */
  motion: {
    respectReducedMotion: false,
  },

  /* 3D dial tunables (assets/js/dial3d.js) */
  dial: {
    idleSpin: true,        // the dial turns slowly on its own
    scrollSpin: 1,         // how much it turns while scrolling (0 = none, 2 = double)
    sweep: true,           // the radar-style sweep that lights up each community in turn
    globe: true,           // faint latitude / longitude lines inside the dial
    buildOnLoad: true,     // ticks and rings assemble after the preloader
    mouseParallax: true,   // the dial tilts slightly towards the cursor
    tiltX: -0.62,          // base tilt (radians) — 0 would be flat-on
    tiltY: 0.26,
  },

  colors: PALETTES[ACTIVE_PALETTE],
};


/* ============================================================================
   APPLY THE THEME  (no need to edit below this line)
   ----------------------------------------------------------------------------
   Writes two sets of CSS variables (dark + light) and configures Tailwind so
   every utility class reads from those variables. Switching mode is then just
   <html data-theme="light"> — see assets/js/main.js.
   ============================================================================ */
(function applyTheme() {
  var P = window.SITE.colors;
  var MODE_KEYS = ['bg', 'surface', 'ink', 'muted', 'accent', 'accent2', 'gold', 'onAccent', 'line', 'shadow', 'gradEnd'];
  var CSS_NAMES = { accent2: 'accent-2', onAccent: 'on-accent', gradEnd: 'grad-end' };

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return ((n >> 16) & 255) + ' ' + ((n >> 8) & 255) + ' ' + (n & 255);
  }
  function modeVars(mode) {
    var M = P[mode], s = '';
    MODE_KEYS.forEach(function (k) {
      var name = CSS_NAMES[k] || k;
      s += '--' + name + ':' + M[k] + ';--' + name + '-rgb:' + hexToRgb(M[k]) + ';';
    });
    return s;
  }

  /* 1) CSS variables — used by assets/css/styles.css and the 3D dial */
  var brandVars = '';
  Object.keys(P.brand).forEach(function (k) {
    brandVars += '--brand-' + k + ':' + P.brand[k] + ';--brand-' + k + '-rgb:' + hexToRgb(P.brand[k]) + ';';
  });
  var css =
    ':root{' + brandVars + modeVars('dark') + 'color-scheme:dark;}' +
    ':root[data-theme="light"]{' + modeVars('light') + 'color-scheme:light;}' +
    /* sections that stay dark in both modes (e.g. "Why Dubai") */
    '.band-dark{' + modeVars('dark') + 'color-scheme:dark;}';
  var style = document.createElement('style');
  style.id = 'theme-vars';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  /* 2) Tailwind — semantic colour names used throughout index.html.
        They point at the variables, so bg-accent/15, text-muted, border-line/10 …
        all follow the dark / light switch automatically. */
  if (window.tailwind) {
    window.tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand:   P.brand,                                   // bg-brand-500, text-brand-300 …
            accent:  'rgb(var(--accent-rgb) / <alpha-value>)',  // text-accent, bg-accent/10 …
            gold:    'rgb(var(--gold-rgb) / <alpha-value>)',
            night:   'rgb(var(--bg-rgb) / <alpha-value>)',      // bg-night
            surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
            ink:     'rgb(var(--ink-rgb) / <alpha-value>)',
            muted:   'rgb(var(--muted-rgb) / <alpha-value>)',
            line:    'rgb(var(--line-rgb) / <alpha-value>)',    // border-line/10, bg-line/5 …
          },
          fontFamily: {
            display: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            sans:    ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
          },
        },
      },
    };
  }

  /* 3) Browser UI colour (mobile address bar) for the mode we start in */
  var mode = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', P[mode].bg);
})();
