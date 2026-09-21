# 360 Reality — website

A single-page real-estate brokerage site built with **HTML + Tailwind CSS + Three.js**.
No build step: open `index.html` in a browser, or upload the folder to any web host.

```
360 reality/
├── index.html              ← all page content (edit text, listings, images here)
├── README.md
└── assets/
    ├── css/styles.css      ← custom styles (uses the colour variables — no hard-coded colours)
    ├── img/favicon.svg
    └── js/
        ├── theme.js        ← ★ COLOUR SCHEME + CONTACT DETAILS + 3D SETTINGS (the only file you must edit)
        ├── building3d.js   ← the 3D tower (Three.js)
        └── main.js         ← nav, preloader, scroll animations, filters, contact form
```

---

## 1. Change the colour scheme

Open `assets/js/theme.js`. Near the top:

```js
var ACTIVE_PALETTE = 'oceanBlue';   // ← change to 'midnightSapphire', 'arcticSteel', 'emeraldLuxe' …
```

Four palettes ship with the site. To make your own, copy one of the palette blocks, rename it, and edit the hex values:

| key       | used for                                                     |
|-----------|--------------------------------------------------------------|
| `brand`   | the main colour scale (50 = lightest … 950 = darkest)        |
| `accent`  | highlights, buttons, glows, the lit windows on the 3D tower  |
| `bg`      | page background                                              |
| `surface` | cards and panels                                             |
| `ink`     | main text                                                    |
| `muted`   | secondary text                                               |

Everything follows automatically — Tailwind classes (`bg-brand-500`, `text-accent` …), the custom CSS (`var(--accent)` …) **and** the 3D building.

> Tip: generate a full 50–950 scale from one colour with a tool such as uicolors.app, then paste the values in.

## 2. Receive enquiries in your inbox

The contact form posts to [FormSubmit](https://formsubmit.co) — free, no account, no server.

1. In `assets/js/theme.js` set
   ```js
   email: 'you@yourdomain.com',
   ```
2. Open the site and send one test enquiry.
3. FormSubmit emails **you** an activation link — click **Activate**.
4. Every enquiry from then on arrives as a neat table in your inbox (subject is set by `SITE.form.subject`).

Prefer another service? [Web3Forms](https://web3forms.com) or [Formspree](https://formspree.io) work the same way — change the endpoint in `main.js` (search for `formsubmit.co`).

## 3. Phone, WhatsApp, address, socials

Also in `theme.js` → `SITE.contact`. The page reads these automatically (elements marked `data-bind="contact.phone"` etc.), so you only change them once.

- `whatsapp` must be digits only with country code, e.g. `971501234567`.
- `licence` shows in the footer (RERA / ORN number).

## 4. Edit the content

All copy lives in `index.html`, section by section (each has a comment banner):

- **Hero chapters** — three captions that swap as the visitor scrolls (`.chapter` blocks).
- **Stats** — change the `data-count` numbers.
- **Featured properties** — each card is a `.property-item`; set `data-type="apartment|villa"` and `data-status="ready|offplan"` so the filter buttons work.
- **Communities / Services / Process / Testimonials** — plain text.

### Images
Cards use Unsplash placeholders. Replace each `<img src="…">` with your own photo (put files in `assets/img/` and reference them as `assets/img/photo.jpg`). If an image fails to load the card simply shows its gradient — nothing breaks.

## 5. Tune the 3D building

`theme.js` → `SITE.scene`:

```js
floors: 40,          // height of the main tower
twistDegrees: 88,    // how much it twists
idleSpin: true,      // slow rotation when idle
scrollSpin: 1,       // rotation per scroll (0 = none)
buildOnLoad: true,   // floor-by-floor build animation after the preloader
lightSweep: true,    // pulse of light travelling up the tower
particles: true,
mouseParallax: true,
```

**Where the tower sits in each section** is set with a `data-scene` attribute on the section in `index.html`:

```html
<section id="about" data-scene='{"x":-2.5,"y":0.05,"scale":0.92,"opacity":1,"dolly":0}'>
```

- `x`, `y` — position (positive x = right, positive y = up)
- `scale` — size
- `opacity` — fade the tower behind text-heavy sections
- `dolly` — camera distance (negative = closer)

The hero uses a pinned section (`data-pin`) with three chapters; each chapter's `data-at` (0 → 1) says where in the scroll it appears.

## 6. Publish

Upload the whole folder to any host — Netlify Drop, Vercel, GitHub Pages, cPanel, etc. There is nothing to compile.

**Going to production?** The site loads Tailwind from its CDN for convenience. For the fastest possible load, compile it once:

```bash
npx tailwindcss -i assets/css/tailwind.in.css -o assets/css/tailwind.css --minify
```

then replace the `<script src="https://cdn.tailwindcss.com">` line with `<link rel="stylesheet" href="assets/css/tailwind.css">` (and move the `colors` / `fontFamily` from `theme.js` into a `tailwind.config.js`). Optional — the CDN version works fine.
