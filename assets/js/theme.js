/* ============================================================================
   360 REALITY — SITE CONFIG & COLOUR THEME
   ----------------------------------------------------------------------------
   This is the ONE file you need to edit for:

     1. COLOUR SCHEME  → change ACTIVE_PALETTE below (or edit / add a palette)
     2. ENQUIRY EMAIL  → SITE.contact.email  (where the contact form delivers)
     3. Phone, WhatsApp, address, opening hours, social links
     4. 3D building behaviour → SITE.scene

   Every colour on the site — Tailwind classes (bg-brand-500, text-accent …),
   custom CSS (var(--brand-500), var(--accent) …) and the 3D tower — is
   generated from the active palette, so changing it here changes everything.
   ============================================================================ */

var PALETTES = {

  /* ── Default: deep navy + electric blue + cyan glow ─────────────────────── */
  oceanBlue: {
    brand: {                       // main blue scale (50 = lightest, 950 = darkest)
      50:  '#eef6ff', 100: '#d9eaff', 200: '#b9daff', 300: '#86c2ff', 400: '#4d9fff',
      500: '#237cff', 600: '#0c5cf2', 700: '#0a47d4', 800: '#0e3aa9', 900: '#123486', 950: '#0a1c4d',
    },
    accent:  '#3fe4ff',            // highlights, glows, lit windows on the tower
    bg:      '#030812',            // page background
    surface: '#08132b',            // cards / panels
    ink:     '#e9f1ff',            // main text
    muted:   '#8fa3c4',            // secondary text
  },

  /* ── Darker, more "royal" blue ──────────────────────────────────────────── */
  midnightSapphire: {
    brand: {
      50:  '#eef2ff', 100: '#dde4ff', 200: '#c2cdff', 300: '#98aaff', 400: '#6b7dff',
      500: '#4a55f7', 600: '#3a3ae6', 700: '#302ecb', 800: '#2a28a3', 900: '#262781', 950: '#10103f',
    },
    accent:  '#8fb6ff',
    bg:      '#04051a',
    surface: '#0b0d2b',
    ink:     '#eef0ff',
    muted:   '#9aa3cf',
  },

  /* ── Cooler steel / arctic blue ─────────────────────────────────────────── */
  arcticSteel: {
    brand: {
      50:  '#f0f7fb', 100: '#dbeaf3', 200: '#bcd8e8', 300: '#8fbcd6', 400: '#5a99bf',
      500: '#3b7ca6', 600: '#2d6389', 700: '#27506f', 800: '#24445d', 900: '#223a4f', 950: '#142534',
    },
    accent:  '#7fe3ff',
    bg:      '#071018',
    surface: '#0e1a26',
    ink:     '#ecf4f9',
    muted:   '#8ea4b5',
  },

  /* ── Example of a non-blue scheme (emerald + gold) — proves nothing is locked */
  emeraldLuxe: {
    brand: {
      50:  '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
      500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22',
    },
    accent:  '#f5d67a',
    bg:      '#03100b',
    surface: '#07211a',
    ink:     '#eafff5',
    muted:   '#8fb8a6',
  },
};

/* ▼▼▼  PICK THE ACTIVE COLOUR SCHEME HERE  ▼▼▼ */
var ACTIVE_PALETTE = 'midnightSapphire';


/* ============================================================================
   SITE SETTINGS
   ============================================================================ */
window.SITE = {
  name: '360 Reality',
  tagline: 'Premium Real Estate Brokerage',

  contact: {
    /* ▼▼▼  ENQUIRIES FROM THE CONTACT FORM ARE SENT HERE  ▼▼▼
       The form uses FormSubmit (https://formsubmit.co) — no account needed.
       The very first message triggers an activation email to this address:
       click "Activate" once and every enquiry after that lands in your inbox. */
    email:     'Sukhothai@360core.ae',

    phone:     '+971 4 000 0000',          // shown on the site
    phoneHref: '+97140000000',             // used for tap-to-call (digits only)
    whatsapp:  '971500000000',             // digits only, country code first (no +)
    address:   'Level 21, Skyline Tower, Marina District',
    city:      'Dubai, United Arab Emirates',
    hours:     'Mon – Sat · 9:00 – 19:00',
    licence:   'Brokerage Licence No. 000000',   // e.g. RERA / ORN number
    socials: {
      instagram: 'https://instagram.com/',
      linkedin:  'https://linkedin.com/',
      facebook:  'https://facebook.com/',
    },
  },

  form: {
    subject: 'New enquiry from the 360 Reality website',
  },

  /* 3D building tunables */
  scene: {
    floors: 40,            // number of floors on the main twisting tower
    twistDegrees: 88,      // total twist from bottom to top
    idleSpin: true,        // slow rotation even when not scrolling
    scrollSpin: 1,         // how much the tower turns while scrolling (0 = none, 2 = double)
    buildOnLoad: true,     // "construction" animation on page load
    lightSweep: true,      // pulse of light travelling up the tower
    particles: true,       // floating light particles
    mouseParallax: true,   // camera follows the mouse slightly
  },

  colors: PALETTES[ACTIVE_PALETTE],
};


/* ============================================================================
   APPLY THE THEME  (no need to edit below this line)
   ============================================================================ */
(function applyTheme() {
  var C = window.SITE.colors;

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return ((n >> 16) & 255) + ' ' + ((n >> 8) & 255) + ' ' + (n & 255);
  }

  /* 1) Tailwind — semantic colour names used throughout index.html */
  if (window.tailwind) {
    window.tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand:   C.brand,      // bg-brand-500, text-brand-300, border-brand-700/40 …
            accent:  C.accent,     // text-accent, bg-accent/10 …
            night:   C.bg,         // bg-night
            surface: C.surface,    // bg-surface
            ink:     C.ink,        // text-ink
            muted:   C.muted,      // text-muted
          },
          fontFamily: {
            display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
            sans:    ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          },
          boxShadow: {
            glow: '0 0 60px -12px ' + C.accent + 'aa',
            card: '0 24px 60px -24px rgba(0,0,0,.7)',
          },
        },
      },
    };
  }

  /* 2) CSS variables — used by assets/css/styles.css */
  var root = document.documentElement.style;
  Object.keys(C.brand).forEach(function (k) {
    root.setProperty('--brand-' + k, C.brand[k]);
    root.setProperty('--brand-' + k + '-rgb', hexToRgb(C.brand[k]));
  });
  ['accent', 'bg', 'surface', 'ink', 'muted'].forEach(function (k) {
    root.setProperty('--' + k, C[k]);
    root.setProperty('--' + k + '-rgb', hexToRgb(C[k]));
  });

  /* 3) Browser UI colour (mobile address bar) */
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', C.bg);
})();
